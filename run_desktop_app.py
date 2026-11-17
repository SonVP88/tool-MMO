import sys
import os
import time
import subprocess
import urllib.request
import threading
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def is_server_alive(url):
    try:
        resp = urllib.request.urlopen(url, timeout=1.5)
        return resp.status == 200
    except Exception:
        return False

def ensure_bridge_server():
    if not is_server_alive("http://127.0.0.1:5678/api/tasks"):
        print("[*] Đang khởi động tiến trình ngầm Backend Bridge Server...")
        server_script = BASE_DIR / "python-worker" / "local_bridge_server.py"
        creation_flags = 0x08000000 if sys.platform == "win32" else 0
        subprocess.Popen(
            [sys.executable, str(server_script)],
            cwd=str(BASE_DIR),
            creationflags=creation_flags
        )
        for _ in range(10):
            time.sleep(0.5)
            if is_server_alive("http://127.0.0.1:5678/api/tasks"):
                break

def ensure_frontend_server():
    if not is_server_alive("http://127.0.0.1:5173"):
        print("[*] Đang khởi động giao diện Studio...")
        creation_flags = 0x08000000 if sys.platform == "win32" else 0
        subprocess.Popen(
            ["npx", "vite", "--host", "127.0.0.1", "--port", "5173"],
            shell=True,
            cwd=str(BASE_DIR),
            creationflags=creation_flags
        )
        for _ in range(15):
            time.sleep(0.5)
            if is_server_alive("http://127.0.0.1:5173"):
                break

def launch_native_window():
    ensure_bridge_server()
    ensure_frontend_server()

    app_url = "http://127.0.0.1:5173"
    app_title = "AUTOMATION STUDIO - TỰ ĐỘNG HÓA SẢN XUẤT HÀNG LOẠT"

    # Try pywebview (Native Windows WebView2 window)
    try:
        import webview
        print("[*] Đang mở cửa sổ ứng dụng Desktop (Native WebView2 Window)...")
        window = webview.create_window(
            title=app_title,
            url=app_url,
            width=1360,
            height=840,
            min_size=(1200, 750),
            background_color='#0f141c',
            resizable=True
        )
        webview.start()
        return
    except Exception as e:
        print(f"[!] Chuyển sang Native App Mode (Edge): {e}")

    # Fallback to Edge Desktop App Mode (100% native standalone window, no browser tabs/url bar)
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for ep in edge_paths:
        if os.path.exists(ep):
            subprocess.Popen([
                ep,
                f"--app={app_url}",
                f"--window-size=1360,840",
                f"--app-id=tool_mmo_studio",
                f"--name={app_title}"
            ])
            return

if __name__ == "__main__":
    launch_native_window()
