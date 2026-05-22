const express   = require('express');
const router    = express.Router();
const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');
const { RunHistory } = require('../models');

// tmp folder inside the project — avoids Windows Device Guard blocks on system temp
const TMP = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ─────────────────────────────────────────────────────────────
// POST /api/run
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { language, code, stdin = '' } = req.body;

  if (!language || !code)
    return res.status(400).json({ message: 'language and code are required' });

  const id   = `cf_${Date.now()}`;
  const t0   = Date.now();

  try {
    let result;
    if      (language === 'python') result = await runPython(id, code, stdin);
    else if (language === 'c')      result = await runC(id, code, stdin);
    else if (language === 'cpp')    result = await runCpp(id, code, stdin);
    else if (language === 'java')   result = await runJava(id, code, stdin);
    else return res.status(400).json({ message: `Unsupported language: ${language}` });

    const time = ((Date.now() - t0) / 1000).toFixed(2);

    // Save history (non-blocking)
    RunHistory.create({ language, code, stdin,
      stdout: result.stdout, stderr: result.stderr,
      exit_code: result.exit_code, execution_time: parseFloat(time)
    }).catch(() => {});

    return res.json({ stdout: result.stdout, stderr: result.stderr, exit_code: result.exit_code, time });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PYTHON — spawn python directly, pipe stdin
// ─────────────────────────────────────────────────────────────
function runPython(id, code, stdin) {
  const file = path.join(TMP, `${id}.py`);
  // Write code as-is; Python handles its own encoding
  fs.writeFileSync(file, code);
  const env = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
  return runProcess('python', [file], stdin, env, [file]);
}

// ─────────────────────────────────────────────────────────────
// C — compile with gcc then run
// ─────────────────────────────────────────────────────────────
async function runC(id, code, stdin) {
  const src = path.join(TMP, `${id}.c`);
  const exe = path.join(TMP, `${id}_c.exe`);
  fs.writeFileSync(src, code);

  // Step 1: compile
  const compile = await runProcess('gcc', [src, '-o', exe], '', process.env, []);
  if (compile.exit_code !== 0) {
    del([src, exe]);
    return { stdout: '', stderr: compile.stderr, exit_code: 1 };
  }

  // Step 2: run
  return runProcess(exe, [], stdin, process.env, [src, exe]);
}

// ─────────────────────────────────────────────────────────────
// C++ — compile with g++ then run
// ─────────────────────────────────────────────────────────────
async function runCpp(id, code, stdin) {
  const src = path.join(TMP, `${id}.cpp`);
  const exe = path.join(TMP, `${id}_cpp.exe`);
  fs.writeFileSync(src, code);

  const compile = await runProcess('g++', [src, '-o', exe], '', process.env, []);
  if (compile.exit_code !== 0) {
    del([src, exe]);
    return { stdout: '', stderr: compile.stderr, exit_code: 1 };
  }

  return runProcess(exe, [], stdin, process.env, [src, exe]);
}

// ─────────────────────────────────────────────────────────────
// JAVA — compile with javac then run with java
// ─────────────────────────────────────────────────────────────
async function runJava(id, code, stdin) {
  // Extract public class name (Java requires filename == class name)
  const match     = code.match(/public\s+class\s+(\w+)/);
  const className = match ? match[1] : 'Main';
  const dir       = path.join(TMP, id);
  const src       = path.join(dir, `${className}.java`);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(src, code);

  // Compile
  const compile = await runProcess('javac', [src], '', process.env, []);
  if (compile.exit_code !== 0) {
    del([dir]);
    return { stdout: '', stderr: compile.stderr, exit_code: 1 };
  }

  // Run: java -cp <dir> <ClassName>
  return runProcess('java', ['-cp', dir, className], stdin, process.env, [dir]);
}

// ─────────────────────────────────────────────────────────────
// CORE: spawn a process, pipe stdin, collect stdout/stderr
// ─────────────────────────────────────────────────────────────
function runProcess(cmd, args, stdin, env, filesToDelete) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let done   = false;

    const proc = spawn(cmd, args, {
      env,
      // shell: false — we pass args directly, no shell interpretation needed
      // This avoids ALL Windows shell escaping issues
      shell: false
    });

    // Write stdin then close — this is the correct way to feed input
    // Java Scanner, Python input(), C scanf all work with this approach
    if (stdin && stdin.trim().length > 0) {
      proc.stdin.write(stdin);
    }
    proc.stdin.end(); // send EOF

    proc.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });

    // Timeout: kill after 10 seconds
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        proc.kill('SIGKILL');
        del(filesToDelete);
        resolve({
          stdout,
          stderr: 'Execution timed out (10s limit). If your code needs input, fill the STDIN box first.',
          exit_code: 1
        });
      }
    }, 10000);

    proc.on('close', (code) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        del(filesToDelete);
        resolve({ stdout, stderr, exit_code: code ?? 0 });
      }
    });

    proc.on('error', (err) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        del(filesToDelete);
        resolve({ stdout: '', stderr: `Failed to start process: ${err.message}`, exit_code: 1 });
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Delete temp files/dirs
// ─────────────────────────────────────────────────────────────
function del(items) {
  for (const f of items) {
    try {
      if (!fs.existsSync(f)) continue;
      const s = fs.statSync(f);
      if (s.isDirectory()) fs.rmSync(f, { recursive: true, force: true });
      else fs.unlinkSync(f);
    } catch (_) {}
  }
}

module.exports = router;
