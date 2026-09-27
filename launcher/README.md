# Skin Goddess Launcher

A Windows desktop launcher for the Skin Goddess Clinic Management System.

## What it does

Double-clicking the launcher (or running `launcher.py`) will:

1. Start the **FastAPI backend** via `server/venv/Scripts/uvicorn.exe`
2. Start the **React frontend** via `npm run dev -- --host 0.0.0.0`
3. Poll both servers until they are **actually responding** (no fixed sleep)
4. Detect the machine's **LAN IP address** automatically
5. **Open the browser** to `http://<LAN-IP>:5173`
6. Show a **status window** with live indicators and the network address

When closed via **STOP SERVER**, only the two processes started by the launcher
are terminated (using `taskkill /F /T /PID`). Other Node/Python processes are
not affected.

## Running in development (without building an EXE)

```bat
cd launcher
..\server\venv\Scripts\python.exe launcher.py
```

## Building SkinGoddess.exe

### Step 1 — Install PyInstaller (one-time)

```bat
..\server\venv\Scripts\pip install pyinstaller
```

### Step 2 — Run the build script

```bat
build_launcher.bat
```

Output: `launcher\dist\SkinGoddess.exe`

### Step 3 — Create a desktop shortcut

1. Right-click `dist\SkinGoddess.exe` → Send to → Desktop (create shortcut)
2. Right-click the shortcut → Properties → Change Icon → browse to `skin_goddess.ico`

## Replacing the icon

The current `skin_goddess.ico` is a minimal programmatically-generated rose
circle. To use a professional icon:

1. Create (or export) a **square image** of the Skin Goddess logo
2. Convert it to `.ico` format with multiple sizes (16, 32, 48, 64, 256 px)
   - Free tool: https://convertio.co/png-ico/
   - Or: https://www.icoconverter.com/
3. Replace `launcher/skin_goddess.ico` with your new file
4. Re-run `build_launcher.bat` to rebuild the EXE

## What the target computer needs

The current launcher (Option A — dev servers) requires:

| Requirement | Where |
|---|---|
| Python 3.x venv | `server/venv/` — already present |
| Node.js + npm | Installed system-wide, on PATH |
| `client/node_modules/` | Already installed |
| PostgreSQL running | Must be accessible at `DATABASE_URL` in `server/.env` |

The EXE itself is self-contained Python.
It does **not** bundle Node.js or the React project.
The project folder must remain in place next to the EXE,
**or** the EXE must be placed in the `launcher/` subfolder.

## Ports

| Service | Port | Accessible |
|---|---|---|
| FastAPI backend | 8000 | `http://<LAN-IP>:8000` |
| React frontend | 5173 | `http://<LAN-IP>:5173` |

The frontend port (5173) is what users open in their browser.
The backend port (8000) is used internally by the frontend proxy.

## LAN access

The frontend is started with `--host 0.0.0.0` so it binds to all
network interfaces. Any device on the same Wi-Fi can reach:

```
http://192.168.x.x:5173
```

The exact IP is shown in the launcher window after startup.

## Troubleshooting

| Error shown | Fix |
|---|---|
| Python venv not found | Re-create: `cd server && py -m venv venv && pip install -r requirements.txt` |
| npm not found | Install Node.js from https://nodejs.org |
| node_modules missing | `cd client && npm install` |
| Port already in use | Another process is using 8000 or 5173. Kill it or restart the PC |
| Backend failed | Check `server/.env` — is DATABASE_URL pointing to a running PostgreSQL? |
| Backend timed out (60 s) | PostgreSQL may be down or unreachable |
