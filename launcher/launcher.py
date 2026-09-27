"""
Skin Goddess — Windows Desktop Launcher
========================================

Starts the FastAPI backend (Uvicorn) and React frontend (Vite dev server),
waits until both are actually responding, then opens the browser.

Architecture:
  - Backend:  server/venv/Scripts/uvicorn.exe  app.main:app --host 0.0.0.0 --port 8000
  - Frontend: npm run dev -- --host 0.0.0.0    (exposes Vite on all interfaces)
  - Both processes are tracked by PID; only they are stopped when the launcher exits.

LAN access:
  The frontend is exposed on 0.0.0.0:5173 so other devices on the same
  Wi-Fi can reach it at  http://<this-pc-ip>:5173
"""

import os
import sys
import socket
import subprocess
import threading
import time
import webbrowser
import tkinter as tk
from tkinter import font as tkfont
import urllib.request
import urllib.error

# ─────────────────────────────────────────────────────────────────────────────
# Paths (resolved relative to this script so the launcher works from any cwd)
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR     = os.path.dirname(SCRIPT_DIR)          # skin-goddess/
SERVER_DIR   = os.path.join(ROOT_DIR, "server")     # skin-goddess/server/
CLIENT_DIR   = os.path.join(ROOT_DIR, "client")     # skin-goddess/client/
VENV_PYTHON  = os.path.join(SERVER_DIR, "venv", "Scripts", "python.exe")
VENV_UVICORN = os.path.join(SERVER_DIR, "venv", "Scripts", "uvicorn.exe")
ICO_PATH     = os.path.join(SCRIPT_DIR, "skin_goddess.ico")

BACKEND_PORT  = 8000
FRONTEND_PORT = 5173

BRAND       = "#FFB0B6"
BRAND_DARK  = "#D4545D"
BRAND_SOFT  = "#FFF0F1"
TEXT_DARK   = "#1C1917"
TEXT_MUTED  = "#78716C"
BG          = "#FAFAFA"
SURFACE     = "#FFFFFF"

# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

def get_lan_ip() -> str:
    """Return the machine's outward-facing LAN IPv4 address."""
    try:
        # Connect to a public address (never actually sends data) to find
        # which local interface the OS would use for outbound traffic.
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def is_port_responding(port: int, path: str = "/") -> bool:
    """Return True if localhost:<port><path> returns an HTTP response."""
    try:
        url = f"http://127.0.0.1:{port}{path}"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.status < 500
    except Exception:
        return False


def find_npm() -> str | None:
    """Locate npm.cmd on Windows PATH."""
    import shutil
    return shutil.which("npm.cmd") or shutil.which("npm")


def find_node() -> str | None:
    import shutil
    return shutil.which("node")


# ─────────────────────────────────────────────────────────────────────────────
# Launcher GUI
# ─────────────────────────────────────────────────────────────────────────────

class SkinGoddessLauncher:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.backend_proc: subprocess.Popen | None  = None
        self.frontend_proc: subprocess.Popen | None = None
        self.lan_ip = get_lan_ip()
        self._stop_event = threading.Event()

        self._build_ui()
        self._start_all()

    # ── UI construction ───────────────────────────────────────────────────────

    def _build_ui(self):
        root = self.root
        root.title("Skin Goddess Launcher")
        root.resizable(False, False)
        root.configure(bg=BG)

        # Set window icon
        if os.path.exists(ICO_PATH):
            try:
                root.iconbitmap(ICO_PATH)
            except Exception:
                pass

        # ── Brand header ──
        header = tk.Frame(root, bg=BRAND, padx=0, pady=0)
        header.pack(fill="x")

        # Logo circle
        canvas = tk.Canvas(header, width=64, height=64, bg=BRAND, highlightthickness=0)
        canvas.pack(pady=(20, 8))
        canvas.create_oval(4, 4, 60, 60, fill=BRAND_DARK, outline="")
        canvas.create_text(32, 32, text="SG", fill="white",
                           font=("Segoe UI", 16, "bold"))

        tk.Label(header, text="Skin Goddess", font=("Segoe UI", 16, "bold"),
                 bg=BRAND, fg=SURFACE).pack()
        tk.Label(header, text="Clinic Management System", font=("Segoe UI", 9),
                 bg=BRAND, fg="#ffffff").pack(pady=(2, 16))

        # ── Status panel ──
        status_frame = tk.Frame(root, bg=SURFACE, padx=24, pady=18)
        status_frame.pack(fill="x")

        # Backend status row
        be_row = tk.Frame(status_frame, bg=SURFACE)
        be_row.pack(fill="x", pady=4)
        tk.Label(be_row, text="Backend", font=("Segoe UI", 10),
                 bg=SURFACE, fg=TEXT_DARK, width=12, anchor="w").pack(side="left")
        self._be_dot = tk.Label(be_row, text="●", font=("Segoe UI", 12),
                                 bg=SURFACE, fg=TEXT_MUTED)
        self._be_dot.pack(side="left")
        self._be_label = tk.Label(be_row, text="Starting…", font=("Segoe UI", 10),
                                   bg=SURFACE, fg=TEXT_MUTED)
        self._be_label.pack(side="left", padx=(6, 0))

        # Frontend status row
        fe_row = tk.Frame(status_frame, bg=SURFACE)
        fe_row.pack(fill="x", pady=4)
        tk.Label(fe_row, text="Frontend", font=("Segoe UI", 10),
                 bg=SURFACE, fg=TEXT_DARK, width=12, anchor="w").pack(side="left")
        self._fe_dot = tk.Label(fe_row, text="●", font=("Segoe UI", 12),
                                 bg=SURFACE, fg=TEXT_MUTED)
        self._fe_dot.pack(side="left")
        self._fe_label = tk.Label(fe_row, text="Starting…", font=("Segoe UI", 10),
                                   bg=SURFACE, fg=TEXT_MUTED)
        self._fe_label.pack(side="left", padx=(6, 0))

        # Divider
        tk.Frame(root, bg="#E8E3E3", height=1).pack(fill="x")

        # ── Address panel ──
        addr_frame = tk.Frame(root, bg=SURFACE, padx=24, pady=16)
        addr_frame.pack(fill="x")

        tk.Label(addr_frame, text="Server Address", font=("Segoe UI", 9, "bold"),
                 bg=SURFACE, fg=TEXT_MUTED).pack(anchor="w")

        self._addr_var = tk.StringVar(value="Waiting for servers…")
        self._addr_label = tk.Label(
            addr_frame,
            textvariable=self._addr_var,
            font=("Segoe UI", 11, "bold"),
            bg=SURFACE,
            fg=TEXT_DARK,
            cursor="hand2",
        )
        self._addr_label.pack(anchor="w", pady=(4, 0))
        self._addr_label.bind("<Button-1>", self._open_browser)

        self._network_note = tk.Label(
            addr_frame,
            text="",
            font=("Segoe UI", 8),
            bg=SURFACE,
            fg=TEXT_MUTED,
            justify="left",
        )
        self._network_note.pack(anchor="w", pady=(2, 0))

        # ── Log / error area ──
        log_frame = tk.Frame(root, bg=BG, padx=16, pady=0)
        log_frame.pack(fill="x")

        self._log_text = tk.Text(
            log_frame,
            height=4,
            font=("Consolas", 8),
            bg="#F5F5F5",
            fg=TEXT_MUTED,
            relief="flat",
            bd=0,
            wrap="word",
            state="disabled",
        )
        self._log_text.pack(fill="x", pady=(8, 8))

        # ── Buttons ──
        btn_frame = tk.Frame(root, bg=BG, padx=16, pady=12)
        btn_frame.pack(fill="x")

        self._open_btn = tk.Button(
            btn_frame,
            text="OPEN APP",
            font=("Segoe UI", 10, "bold"),
            bg=BRAND,
            fg="white",
            activebackground=BRAND_DARK,
            activeforeground="white",
            relief="flat",
            cursor="hand2",
            padx=24,
            pady=8,
            state="disabled",
            command=self._open_browser,
        )
        self._open_btn.pack(fill="x", pady=(0, 6))

        self._stop_btn = tk.Button(
            btn_frame,
            text="STOP SERVER",
            font=("Segoe UI", 9),
            bg="#F0EEEE",
            fg=TEXT_DARK,
            activebackground="#E0DCDC",
            relief="flat",
            cursor="hand2",
            padx=24,
            pady=6,
            command=self._confirm_stop,
        )
        self._stop_btn.pack(fill="x")

        # Window close button
        root.protocol("WM_DELETE_WINDOW", self._confirm_stop)

        # Minimum window width
        root.update_idletasks()
        root.minsize(320, root.winfo_reqheight())

    # ── Logging ───────────────────────────────────────────────────────────────

    def _log(self, msg: str, error: bool = False):
        def _update():
            self._log_text.configure(state="normal")
            color = "#DC2626" if error else TEXT_MUTED
            self._log_text.insert("end", msg + "\n")
            self._log_text.see("end")
            self._log_text.configure(state="disabled")
        self.root.after(0, _update)

    # ── Status updates ────────────────────────────────────────────────────────

    def _set_backend_status(self, status: str):
        """status: 'starting' | 'running' | 'error'"""
        colors = {"starting": (TEXT_MUTED, TEXT_MUTED, "Starting…"),
                  "running":  ("#16A34A", "#16A34A", "Running"),
                  "error":    ("#DC2626", "#DC2626", "Failed")}
        dot_c, lbl_c, lbl_t = colors.get(status, colors["starting"])
        def _update():
            self._be_dot.configure(fg=dot_c)
            self._be_label.configure(fg=lbl_c, text=lbl_t)
        self.root.after(0, _update)

    def _set_frontend_status(self, status: str):
        colors = {"starting": (TEXT_MUTED, TEXT_MUTED, "Starting…"),
                  "running":  ("#16A34A", "#16A34A", "Running"),
                  "error":    ("#DC2626", "#DC2626", "Failed")}
        dot_c, lbl_c, lbl_t = colors.get(status, colors["starting"])
        def _update():
            self._fe_dot.configure(fg=dot_c)
            self._fe_label.configure(fg=lbl_c, text=lbl_t)
        self.root.after(0, _update)

    def _set_ready(self):
        url = f"http://{self.lan_ip}:{FRONTEND_PORT}"
        local = f"http://localhost:{FRONTEND_PORT}"
        def _update():
            self._addr_var.set(url)
            self._network_note.configure(
                text=f"Other devices on Wi-Fi: {url}\nThis PC only: {local}"
            )
            self._open_btn.configure(state="normal")
        self.root.after(0, _update)

    # ── Process startup ───────────────────────────────────────────────────────

    def _start_all(self):
        """Kick off both servers in a background thread."""
        t = threading.Thread(target=self._startup_thread, daemon=True)
        t.start()

    def _startup_thread(self):
        # ── Pre-flight checks ──
        if not os.path.exists(VENV_PYTHON):
            self._log(f"ERROR: Python venv not found at:\n  {VENV_PYTHON}", error=True)
            self._log("Re-create the venv: cd server && py -m venv venv && pip install -r requirements.txt", error=True)
            self._set_backend_status("error")
            return

        npm = find_npm()
        if not npm:
            self._log("ERROR: npm not found on PATH. Install Node.js from https://nodejs.org", error=True)
            self._set_frontend_status("error")
            return

        node_modules = os.path.join(CLIENT_DIR, "node_modules")
        if not os.path.isdir(node_modules):
            self._log("ERROR: client/node_modules missing. Run: cd client && npm install", error=True)
            self._set_frontend_status("error")
            return

        # ── Start backend ──
        self._log("Starting backend (FastAPI/Uvicorn)…")
        try:
            self.backend_proc = subprocess.Popen(
                [
                    VENV_UVICORN,
                    "app.main:app",
                    "--host", "0.0.0.0",
                    "--port", str(BACKEND_PORT),
                ],
                cwd=SERVER_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            self._log(f"Backend PID: {self.backend_proc.pid}")
        except Exception as exc:
            self._log(f"ERROR: Could not start backend: {exc}", error=True)
            self._set_backend_status("error")
            return

        # ── Start frontend ──
        self._log("Starting frontend (Vite dev server)…")
        try:
            self.frontend_proc = subprocess.Popen(
                [npm, "run", "dev", "--", "--host", "0.0.0.0"],
                cwd=CLIENT_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            self._log(f"Frontend PID: {self.frontend_proc.pid}")
        except Exception as exc:
            self._log(f"ERROR: Could not start frontend: {exc}", error=True)
            self._set_frontend_status("error")
            return

        # ── Wait for backend ──
        self._log("Waiting for backend to respond…")
        deadline = time.time() + 60  # 60 s timeout
        while time.time() < deadline and not self._stop_event.is_set():
            if self.backend_proc.poll() is not None:
                self._log("ERROR: Backend process exited unexpectedly.", error=True)
                self._set_backend_status("error")
                self._read_proc_output(self.backend_proc)
                return
            if is_port_responding(BACKEND_PORT, "/docs"):
                self._log("Backend ready.")
                self._set_backend_status("running")
                break
            time.sleep(1)
        else:
            self._log("ERROR: Backend did not respond within 60 seconds.", error=True)
            self._set_backend_status("error")
            return

        # ── Wait for frontend ──
        self._log("Waiting for frontend to respond…")
        deadline = time.time() + 90  # 90 s — first `npm run dev` can take longer
        while time.time() < deadline and not self._stop_event.is_set():
            if self.frontend_proc.poll() is not None:
                self._log("ERROR: Frontend process exited unexpectedly.", error=True)
                self._set_frontend_status("error")
                self._read_proc_output(self.frontend_proc)
                return
            if is_port_responding(FRONTEND_PORT, "/"):
                self._log("Frontend ready.")
                self._set_frontend_status("running")
                break
            time.sleep(1)
        else:
            self._log("ERROR: Frontend did not respond within 90 seconds.", error=True)
            self._set_frontend_status("error")
            return

        # ── Both ready ──
        self._set_ready()
        self._log(f"App ready at http://{self.lan_ip}:{FRONTEND_PORT}")
        self._open_browser()

    def _read_proc_output(self, proc: subprocess.Popen):
        """Read the last lines of output from a process that died unexpectedly."""
        try:
            out, _ = proc.communicate(timeout=2)
            if out:
                tail = out.decode(errors="replace").strip()[-800:]
                self._log(tail, error=True)
        except Exception:
            pass

    # ── Browser ───────────────────────────────────────────────────────────────

    def _open_browser(self, _event=None):
        url = f"http://{self.lan_ip}:{FRONTEND_PORT}"
        try:
            webbrowser.open(url)
        except Exception as exc:
            self._log(f"Could not open browser: {exc}", error=True)

    # ── Shutdown ──────────────────────────────────────────────────────────────

    def _confirm_stop(self):
        from tkinter import messagebox
        if self.backend_proc or self.frontend_proc:
            yes = messagebox.askyesno(
                "Stop Skin Goddess?",
                "This will stop the backend and frontend servers.\n\nContinue?",
                parent=self.root,
            )
            if not yes:
                return
        self._stop()

    def _stop(self):
        self._stop_event.set()
        for label, proc in [("Backend", self.backend_proc), ("Frontend", self.frontend_proc)]:
            if proc and proc.poll() is None:
                try:
                    # Terminate child process tree on Windows
                    subprocess.call(
                        ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                        creationflags=subprocess.CREATE_NO_WINDOW,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                    self._log(f"{label} stopped (PID {proc.pid}).")
                except Exception as exc:
                    self._log(f"Could not stop {label}: {exc}", error=True)
        self.root.destroy()


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    root = tk.Tk()
    app = SkinGoddessLauncher(root)
    root.mainloop()


if __name__ == "__main__":
    main()
