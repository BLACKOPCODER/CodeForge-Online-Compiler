const API = 'http://localhost:3000/api';

// Starter code — pure ASCII, no special chars, no emoji
const STARTERS = {
  python:
`# Python - Hello World
def add(a, b):
    return a + b

print("Hello from CodeForge!")
print("10 + 20 =", add(10, 20))

nums = [1, 2, 3, 4, 5]
print("Sum:", sum(nums))
print("Max:", max(nums))
`,
  c:
`// C - Hello World
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    printf("Hello from CodeForge!\\n");
    printf("10 + 20 = %d\\n", add(10, 20));

    int i, sum = 0;
    int nums[] = {1, 2, 3, 4, 5};
    for (i = 0; i < 5; i++) sum += nums[i];
    printf("Sum: %d\\n", sum);

    return 0;
}
`,
  cpp:
`// C++ - Hello World
#include <iostream>
using namespace std;

int add(int a, int b) {
    return a + b;
}

int main() {
    cout << "Hello from CodeForge!" << endl;
    cout << "10 + 20 = " << add(10, 20) << endl;

    int nums[] = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) sum += nums[i];
    cout << "Sum: " << sum << endl;

    return 0;
}
`,
  java:
`// Java - Hello World
public class Main {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        System.out.println("Hello from CodeForge!");
        System.out.println("10 + 20 = " + add(10, 20));

        int[] nums = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : nums) sum += n;
        System.out.println("Sum: " + sum);
    }
}
`
};

const BADGES  = { python: 'PY', c: 'C', cpp: 'C++', java: 'JV' };
const MONLANG = { python: 'python', c: 'c', cpp: 'cpp', java: 'java' };

let editor = null;
let lang   = 'python';

// ── INIT MONACO ──────────────────────────────────────────────
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

require(['vs/editor/editor.main'], () => {
  monaco.editor.defineTheme('cf', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment',  foreground: 'AAAAAA', fontStyle: 'italic' },
      { token: 'keyword',  foreground: 'FF5C00', fontStyle: 'bold' },
      { token: 'string',   foreground: '1A7F00' },
      { token: 'number',   foreground: '0066CC' },
      { token: 'type',     foreground: 'CC0088' },
    ],
    colors: {
      'editor.background':              '#FFFFFF',
      'editor.foreground':              '#0F0F0F',
      'editor.lineHighlightBackground': '#FFF8F5',
      'editor.selectionBackground':     '#FFE0CC',
      'editorLineNumber.foreground':    '#CCCCCC',
      'editorLineNumber.activeForeground': '#FF5C00',
      'editorCursor.foreground':        '#FF5C00',
      'editorIndentGuide.background':   '#F0F0F0',
    }
  });

  editor = monaco.editor.create(document.getElementById('editor'), {
    value:            STARTERS.python,
    language:         'python',
    theme:            'cf',
    fontSize:         14,
    fontFamily:       "'JetBrains Mono', monospace",
    lineHeight:       22,
    padding:          { top: 16, bottom: 16 },
    minimap:          { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout:  true,
    roundedSelection: true,
    smoothScrolling:  true,
    cursorBlinking:   'smooth',
    renderLineHighlight: 'line',
    bracketPairColorization: { enabled: true },
  });
});

// ── SWITCH LANGUAGE ──────────────────────────────────────────
function switchLang(l) {
  lang = l;

  // Update tabs
  document.querySelectorAll('.lang-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.lang === l);
  });

  // Update badge
  document.getElementById('langBadge').textContent = BADGES[l];

  // Update editor
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel(), MONLANG[l]);
    editor.setValue(STARTERS[l]);
  }
}

// ── RESET CODE ───────────────────────────────────────────────
function resetCode() {
  if (editor) editor.setValue(STARTERS[lang]);
  document.getElementById('fileName').value = '';
}

// ── RUN CODE ─────────────────────────────────────────────────
async function runCode() {
  if (!editor) return;

  const code  = editor.getValue();
  const stdin = document.getElementById('stdin').value;

  if (!code.trim()) { toast('Write some code first!', 'err'); return; }

  // UI loading state
  const btn = document.getElementById('runBtn');
  btn.classList.add('running');
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:6px"></div>Running...';

  setOutputLoading();

  try {
    const resp = await fetch(`${API}/run`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ language: lang, code, stdin })
    });

    const data = await resp.json();

    if (!resp.ok) {
      showError('Server Error', data.message || 'Unknown error');
      return;
    }

    renderOutput(data);

  } catch (err) {
    showError('Connection Error', 'Cannot reach backend. Is the server running on port 3000?');
  } finally {
    btn.classList.remove('running');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="2,1 13,7 2,13"/></svg> Run';
  }
}

function setOutputLoading() {
  document.getElementById('outputBody').innerHTML =
    `<div class="output-loading"><div class="spinner"></div><span>RUNNING...</span></div>`;
  document.getElementById('outputMeta').innerHTML = '';
}

function renderOutput(data) {
  const body = document.getElementById('outputBody');
  const meta = document.getElementById('outputMeta');
  const ok   = data.exit_code === 0 && !data.stderr;

  // Meta bar
  meta.innerHTML = `
    <span class="${ok ? 'meta-ok' : 'meta-err'}">${ok ? 'SUCCESS' : 'ERROR'}</span>
    ${data.time ? `<span class="meta-time">${data.time}s</span>` : ''}
    <span class="meta-time">Exit: ${data.exit_code}</span>
  `;

  let html = '';

  if (data.stderr && data.stderr.trim()) {
    html += `<div class="out-stderr"><span class="err-label">ERROR OUTPUT</span>${esc(data.stderr)}</div>`;
  }
  if (data.stdout && data.stdout.trim()) {
    html += `<pre class="out-stdout">${esc(data.stdout)}</pre>`;
  }
  if (!data.stderr && !data.stdout) {
    html = `<div class="empty" style="color:#666">Program ran successfully with no output.</div>`;
  }

  body.innerHTML = html;
}

function showError(title, msg) {
  document.getElementById('outputBody').innerHTML =
    `<div class="out-stderr"><span class="err-label">${title}</span>${esc(msg)}</div>`;
  document.getElementById('outputMeta').innerHTML =
    `<span class="meta-err">FAILED</span>`;
}

// ── SAVE FILE ────────────────────────────────────────────────
function showSave() {
  document.getElementById('saveTitle').value = document.getElementById('fileName').value || '';
  document.getElementById('saveLang').value  = lang.toUpperCase();
  document.getElementById('modalOverlay').classList.add('open');
}

function closeSave(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
}

async function doSave() {
  const title = document.getElementById('saveTitle').value.trim() || 'Untitled';
  const code  = editor ? editor.getValue() : '';

  try {
    const resp = await fetch(`${API}/files`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, language: lang, code })
    });
    if (!resp.ok) throw new Error((await resp.json()).message);
    document.getElementById('fileName').value = title;
    document.getElementById('modalOverlay').classList.remove('open');
    toast('File saved!', 'ok');
  } catch (err) {
    toast('Save failed: ' + err.message, 'err');
  }
}

// ── PANELS ───────────────────────────────────────────────────
function openPanel(type) {
  document.getElementById('panelTitle').textContent = type === 'files' ? 'Saved Files' : 'Run History';
  document.getElementById('panel').classList.add('open');
  document.getElementById('panelOverlay').classList.add('open');
  type === 'files' ? loadFiles() : loadHistory();
}

function closePanel() {
  document.getElementById('panel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('open');
}

async function loadFiles() {
  const body = document.getElementById('panelBody');
  body.innerHTML = '<div class="empty">Loading...</div>';
  try {
    const data = await (await fetch(`${API}/files`)).json();
    if (!data.length) { body.innerHTML = '<div class="empty">No saved files yet.<br/>Save your code using the Save button.</div>'; return; }
    body.innerHTML = data.map(f => `
      <div class="card" onclick="loadFile(${f.id})">
        <div class="card-top">
          <span class="card-title">${esc(f.title)}</span>
          <span class="card-lang lang-${f.language}">${f.language}</span>
        </div>
        <div class="card-meta"><span>${timeAgo(f.created_at)}</span></div>
      </div>`).join('');
  } catch { body.innerHTML = '<div class="empty">Could not load files.<br/>Is the server running?</div>'; }
}

async function loadHistory() {
  const body = document.getElementById('panelBody');
  body.innerHTML = '<div class="empty">Loading...</div>';
  try {
    const data = await (await fetch(`${API}/history`)).json();
    if (!data.length) { body.innerHTML = '<div class="empty">No runs yet.<br/>Run some code first!</div>'; return; }
    body.innerHTML = data.map(h => `
      <div class="card" onclick="loadFromHistory(${JSON.stringify(h.code).replace(/</g,'&lt;')}, '${h.language}')">
        <div class="card-top">
          <span class="card-title">${h.language.toUpperCase()} &mdash; ${timeAgo(h.ran_at)}</span>
          <span class="card-lang lang-${h.language}">${h.language}</span>
        </div>
        <div class="card-meta">
          <span class="${h.exit_code === 0 ? 'status-ok' : 'status-err'}">${h.exit_code === 0 ? 'OK' : 'Error'}</span>
          <span>${timeAgo(h.ran_at)}</span>
        </div>
      </div>`).join('');
  } catch { body.innerHTML = '<div class="empty">Could not load history.<br/>Is the server running?</div>'; }
}

async function loadFile(id) {
  try {
    const f = await (await fetch(`${API}/files/${id}`)).json();
    switchLang(f.language);
    if (editor) editor.setValue(f.code);
    document.getElementById('fileName').value = f.title;
    closePanel();
    toast('File loaded!', 'ok');
  } catch { toast('Could not load file', 'err'); }
}

function loadFromHistory(code, language) {
  switchLang(language);
  if (editor) editor.setValue(code);
  closePanel();
  toast('Code loaded from history', 'ok');
}

// ── COPY OUTPUT ──────────────────────────────────────────────
function copyOut() {
  const text = document.getElementById('outputBody').innerText;
  navigator.clipboard.writeText(text).then(() => toast('Copied!', 'ok'));
}

// ── UTILS ────────────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

let toastT;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.className = 'toast'; }, 3000);
}

// Ctrl+Enter to run
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); }
});
