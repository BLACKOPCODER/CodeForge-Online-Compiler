# CodeForge v2 — Online Compiler

A full-stack online compiler that runs **Python, C, C++, and Java** directly in the browser. Built with Node.js, Express, MySQL, and Monaco Editor (the engine behind VS Code).

![Stack](https://img.shields.io/badge/Node.js-Express-green) ![MySQL](https://img.shields.io/badge/Database-MySQL-blue) ![Languages](https://img.shields.io/badge/Languages-Python%20%7C%20C%20%7C%20C%2B%2B%20%7C%20Java-orange)

---

## Features

- **Monaco Editor** — VS Code-quality editor with syntax highlighting and auto-completion
- **4 Languages** — Python, C, C++, Java
- **Local Execution** — Code runs on your machine using installed compilers, no external API needed
- **STDIN Support** — Feed input to your programs before running
- **Save Files** — Save named code snippets to MySQL and reload them anytime
- **Run History** — Every execution is logged with output, exit code and timestamp
- **Bright UI** — Professional orange and white theme
- **Keyboard Shortcut** — `Ctrl + Enter` to run instantly

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Code Editor | Monaco Editor |
| Backend | Node.js + Express |
| Code Execution | Local system compilers via `child_process.spawn` |
| Database | MySQL 8.0 + Sequelize ORM |

---

## Project Structure

```
codeforge/
│
├── frontend/
│   ├── index.html          Main HTML page
│   ├── style.css           Styles (bright orange theme)
│   └── app.js              Monaco editor + API calls + UI logic
│
├── backend/
│   ├── server.js           Express entry point
│   ├── package.json        Node dependencies
│   ├── .env.example        Environment variables template
│   │
│   ├── config/
│   │   └── database.js     Sequelize / MySQL connection
│   │
│   ├── models/
│   │   └── index.js        CodeFile + RunHistory models
│   │
│   ├── routes/
│   │   ├── run.js          POST /api/run — executes code
│   │   ├── files.js        CRUD /api/files — saved code files
│   │   └── history.js      GET /api/history — run history
│   │
│   └── tmp/                Temp files during compilation (auto-created)
│
└── setup.sql               MySQL database + tables setup script
```

---

## Prerequisites

Make sure all of these are installed and working before starting:

```bash
node --version       # v16 or higher
npm --version        # v8 or higher
python --version     # v3.x
gcc --version        # via MSYS2 on Windows
g++ --version        # via MSYS2 on Windows
java --version       # JDK 21
javac --version      # JDK 21
mysql --version      # MySQL 8.0
```

---

## Setup

### 1. Database

Run the setup script to create the `codeforge` database and tables:

```bash
# Windows
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < setup.sql

# Mac / Linux
mysql -u root -p < setup.sql
```

You should see:
```
CodeForge v2 database ready!
```

---

### 2. Backend

```bash
cd backend

# Create your .env file
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux

# Open and fill in your MySQL password
notepad .env
```

Your `.env` should look like:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=codeforge
DB_USER=root
DB_PASSWORD=your_mysql_password_here
```

```bash
# Install dependencies
npm install

# Start the server
node server.js
```

Expected output:
```
MySQL connected
Tables synced
CodeForge running on http://localhost:3000
```

---

### 3. Frontend

Open a **second terminal** and run:

```bash
cd frontend
npx serve .
```

Open your browser at the URL shown — usually `http://localhost:3001`  
*(port 3001 because 3000 is taken by the backend)*

---

## API Reference

### Run Code
```
POST /api/run
```
```json
// Request
{ "language": "python", "code": "print(42)", "stdin": "" }

// Response
{ "stdout": "42\n", "stderr": "", "exit_code": 0, "time": "0.12" }
```

### Files
```
GET    /api/files           List all saved files
GET    /api/files/:id       Get one file with full code
POST   /api/files           Save a new file
DELETE /api/files/:id       Delete a file
```

### History
```
GET    /api/history         Get last 100 runs
DELETE /api/history         Clear all history
```

### Health Check
```
GET    /api/health
→ { "status": "ok" }
```

---

## Database Schema

### `code_files`
| Column | Type | Description |
|---|---|---|
| id | INT | Primary key |
| title | VARCHAR(255) | File name given by user |
| language | ENUM | python \| c \| cpp \| java |
| code | LONGTEXT | Full source code |
| created_at | DATETIME | Save timestamp |
| updated_at | DATETIME | Last update timestamp |

### `run_history`
| Column | Type | Description |
|---|---|---|
| id | INT | Primary key |
| language | ENUM | python \| c \| cpp \| java |
| code | LONGTEXT | Code that was executed |
| stdin | TEXT | Input provided |
| stdout | TEXT | Program output |
| stderr | TEXT | Errors |
| exit_code | INT | 0 = success |
| execution_time | FLOAT | Seconds taken |
| ran_at | DATETIME | Execution timestamp |

---

## How Execution Works

CodeForge uses Node.js `child_process.spawn` with `shell: false` to run code locally — no external API, no Docker, no internet required.

```
Frontend → POST /api/run
         → Write code to backend/tmp/
         → Compile (C, C++, Java only)
         → Run binary/script
         → Pipe stdin directly to process
         → Collect stdout + stderr
         → Delete temp files
         → Save to run_history
         → Return result to frontend
```

| Language | How it runs |
|---|---|
| Python | `python <file>.py` |
| C | `gcc <file>.c -o <file>.exe` then run |
| C++ | `g++ <file>.cpp -o <file>.exe` then run |
| Java | `javac <Class>.java` then `java -cp <dir> <Class>` |

> **Java note:** The filename must match the public class name. CodeForge extracts the class name automatically from your code.

---

## STDIN (Program Input)

For programs that require input (`input()` in Python, `scanf` in C, `Scanner` in Java):

1. Type your input in the **STDIN box** at the bottom of the editor
2. Put each value on a new line
3. Click **Run**

The input is piped directly to the running process — just like a real terminal.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MySQL connected` fails | Check `DB_PASSWORD` in `.env`. Make sure MySQL service is running. |
| `python` not recognized | Add Python to system PATH |
| `gcc` not recognized | Add `C:\msys64\ucrt64\bin` to system PATH, reopen terminal |
| `java` not recognized | Add `C:\Program Files\Java\jdk-21\bin` to system PATH |
| Connection Error in browser | Backend is not running — start with `node server.js` |
| EOFError / NoSuchElementException | Your code needs input — fill the STDIN box first |
| Port already in use | Change `PORT` in `.env` and update `API_BASE` in `frontend/app.js` |

---

## Daily Startup

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
cd frontend && npx serve .
```

Then open the browser at the frontend URL. Done!
