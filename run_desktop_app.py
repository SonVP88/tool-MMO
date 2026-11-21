#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automation Studio MMO Pro - Desktop App Launcher
1. Automatically verifies & starts local_bridge_server.py on port 5678 (serving both API and UI)
2. Releases any stale/zombie port conflicts cleanly without requiring PowerShell
3. Opens native desktop window via pywebview (WebView2) if available
4. Falls back seamlessly to Edge App Mode (--app=http://127.0.0.1:5678) while keeping the server alive
5. Explicitly bypasses VPN/system proxy for loopback 127.0.0.1 connections
"""

import sys
import os
import time
import shutil
import socket
import threading
import subprocess
import urllib.request
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PORT = 5678
APP_URL = f"http://127.0.0.1:{PORT}"
APP_TITLE = "AUTOMATION STUDIO - TỰ ĐỘNG HÓA SẢN XUẤT HÀNG LOẠT"

# Ensure python-worker directory is available for import
WORKER_DIR = BASE_DIR / "python-worker"
if str(WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(WORKER_DIR))

def kill_port_owner(port: int):
    """Cleanly terminates any zombie/orphaned process holding the specified port."""
    if sys.platform != "win32":
        return
    try:
        output = subprocess.check_output(
            ["netstat", "-ano", "-p", "tcp"],
            creationflags=0x08000000,
            text=True,
            errors="ignore"
        )
        my_pid = os.getpid()
        for line in output.splitlines():
            line = line.strip()
            if f":{port}" in line and "LISTENING" in line:
                parts = line.split()
                if len(parts) >= 5:
                    pid_str = parts[-1]
                    try:
                        pid = int(pid_str)
                        if pid > 0 and pid != my_pid:
                            subprocess.run(
                                ["taskkill", "/F", "/PID", str(pid)],
                                creationflags=0x08000000,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL
                            )
                            time.sleep(0.3)
                    except ValueError:
                        pass
    except Exception:
        pass

def is_server_alive(url: str, timeout: float = 1.0) -> bool:
    """Verifies server responsiveness, explicitly bypassing system/VPN proxies for loopback."""
    try:
        proxy_support = urllib.request.ProxyHandler({})
        opener = urllib.request.build_opener(proxy_support)
        req = urllib.request.Request(url, headers={"User-Agent": "StudioLauncher/2.2"})
        with opener.open(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False

def ensure_bridge_server():
    """Starts local_bridge_server in background thread if not already running."""
    if is_server_alive(f"{APP_URL}/api/tasks"):
        print("[*] Máy chủ Backend & UI (Port 5678) đang hoạt động sẵn sàng.", flush=True)
        return

    # Clear stale port occupier if any
    kill_port_owner(PORT)
    time.sleep(0.4)

    import local_bridge_server
    server_thread = threading.Thread(target=local_bridge_server.run_server, daemon=True)
    server_thread.start()

    # Wait for server to become responsive
    for _ in range(35):
        time.sleep(0.2)
        if is_server_alive(f"{APP_URL}/api/tasks"):
            print("[*] Máy chủ Backend & UI đã sẵn sàng phục vụ.", flush=True)
            return

    raise RuntimeError(f"Không thể kết nối đến máy chủ tại {APP_URL}")

def get_edge_path():
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return shutil.which("msedge")

def launch_native_window():
    ensure_bridge_server()

    # Mode 1: Native WebView2 via pywebview (desktop window, zero browser chrome)
    try:
        import webview
        print("[*] Đang mở cửa sổ ứng dụng Desktop (Native WebView2 Window)...", flush=True)
        window = webview.create_window(
            title=APP_TITLE,
            url=APP_URL,
            width=1360,
            height=840,
            min_size=(1200, 750),
            background_color="#0f141c",
            resizable=True
        )
        webview.start()
        return
    except Exception as e:
        print(f"[*] Thông báo: Chạy qua chế độ Desktop Standalone ({e})", flush=True)

    # Mode 2: Edge Desktop App Mode (100% standalone desktop window, no browser tabs/URL bar)
    edge_exe = get_edge_path()
    if edge_exe:
        print(f"[*] Đang khởi chạy giao diện Desktop Standalone qua Edge App...", flush=True)
        proc = subprocess.Popen([
            edge_exe,
            f"--app={APP_URL}",
            "--window-size=1360,840",
            "--app-id=tool_mmo_studio",
            f"--name={APP_TITLE}",
            "--disable-features=Translate"
        ])
        # Crucial: Keep process alive while Edge window is open!
        try:
            proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
        return

    # Mode 3: System default browser fallback
    print(f"[*] Đang mở trình duyệt mặc định: {APP_URL}", flush=True)
    webbrowser.open(APP_URL)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    launch_native_window()
