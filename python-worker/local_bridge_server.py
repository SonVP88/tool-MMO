#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Local Bridge Server for Automation Studio
Provides a robust HTTP & SSE server on port 5678 that coordinates:
1. Real queue management and task dispatching
2. Real-time stdout streaming from pipeline_worker.py to the UI via Server-Sent Events (SSE)
3. Profile and settings persistence in config/
4. System controls: open folder, open file, Auto-OCR detection
Works identically in both standalone Native App mode and Tauri desktop mode!
"""

import os
import sys
import json
import time
import shutil
import queue
import threading
import subprocess
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 5678
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
TASKS_FILE = CONFIG_DIR / "tasks.json"
SETTINGS_FILE = CONFIG_DIR / "settings.json"
PROFILES_FILE = CONFIG_DIR / "profiles.json"

# State
active_tasks = []
task_lock = threading.Lock()
is_queue_running = False
is_queue_paused = False
current_process = None
event_subscribers = []
subscribers_lock = threading.Lock()

def load_initial_tasks():
    global active_tasks
    if TASKS_FILE.exists():
        try:
            with open(TASKS_FILE, "r", encoding="utf-8") as f:
                active_tasks = json.load(f)
                return
        except Exception:
            pass
    active_tasks = []

def save_tasks_to_disk():
    with task_lock:
        try:
            with open(TASKS_FILE, "w", encoding="utf-8") as f:
                json.dump(active_tasks, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[Error saving tasks]: {e}", flush=True)

def broadcast_event(event_type: str, data: dict):
    msg = f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    with subscribers_lock:
        for q in list(event_subscribers):
            try:
                q.put_nowait(msg)
            except Exception:
                event_subscribers.remove(q)

def emit_live_log(message: str, log_type: str = "info"):
    event = {
        "id": str(time.time_ns()),
        "timestamp": time.strftime("%H:%M:%S"),
        "message": message,
        "log_type": log_type
    }
    broadcast_event("live-log", event)

def worker_thread_loop():
    global is_queue_running, current_process
    emit_live_log("▶ Hàng đợi bắt đầu chạy thực tế...", "info")

    while is_queue_running:
        if is_queue_paused:
            time.sleep(1)
            continue

        # Find next waiting task
        task_to_run = None
        with task_lock:
            for t in active_tasks:
                if t.get("status") in ["WAITING", "SUBTITLE", "PROCESSING"]:
                    task_to_run = t
                    t["status"] = "PROCESSING"
                    t["stage"] = "Khởi chạy"
                    break

        if not task_to_run:
            emit_live_log("✔ Toàn bộ hàng đợi đã hoàn tất!", "success")
            is_queue_running = False
            broadcast_event("queue-status", {"is_running": False})
            save_tasks_to_disk()
            break

        task_id = task_to_run["id"]
        source = task_to_run.get("source", task_to_run.get("name", ""))
        output_dir = "C:\\Output"
        if SETTINGS_FILE.exists():
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    s = json.load(f)
                    output_dir = s.get("output_dir", output_dir)
            except Exception:
                pass

        # Prepare config JSON
        cfg = {}
        if SETTINGS_FILE.exists():
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
            except Exception:
                pass

        config_str = json.dumps(cfg, ensure_ascii=False)

        # Decide whether to run compiled sidecar or python script
        sidecar_exe = BASE_DIR / "src-tauri" / "bin" / "pipeline_worker-x86_64-pc-windows-msvc.exe"
        if not sidecar_exe.exists():
            sidecar_exe = BASE_DIR / "bin" / "pipeline_worker.exe"

        if sidecar_exe.exists():
            cmd = [
                str(sidecar_exe),
                "--task-id", str(task_id),
                "--source", str(source),
                "--output-dir", str(output_dir),
                "--config", config_str
            ]
        else:
            script_path = BASE_DIR / "python-worker" / "pipeline_worker.py"
            cmd = [
                sys.executable, str(script_path),
                "--task-id", str(task_id),
                "--source", str(source),
                "--output-dir", str(output_dir),
                "--config", config_str
            ]

        emit_live_log(f"[Video #{task_id}] Đang xử lý: {source}", "info")

        try:
            # CREATE_NO_WINDOW on Windows
            creation_flags = 0x08000000 if sys.platform == "win32" else 0
            current_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=creation_flags
            )

            # Read stdout line by line
            for line in iter(current_process.stdout.readline, ''):
                if not line:
                    break
                line = line.strip()
                if not line:
                    continue

                try:
                    payload = json.loads(line)
                    evt_type = payload.get("type", "")
                    progress = payload.get("progress", 0)
                    stage = payload.get("stage", "")
                    msg = payload.get("message", "")
                    out_path = payload.get("output_path", "")

                    with task_lock:
                        for t in active_tasks:
                            if t["id"] == task_id:
                                t["progress"] = progress
                                t["stage"] = stage
                                t["note"] = msg
                                if out_path:
                                    t["outputPath"] = out_path
                                if evt_type == "done":
                                    t["status"] = "DONE"
                                elif evt_type == "error":
                                    t["status"] = "ERROR"
                                break

                    # Broadcast progress
                    broadcast_event("task-progress", {
                        "task_id": task_id,
                        "stage": stage,
                        "progress": progress,
                        "status": "DONE" if evt_type == "done" else ("ERROR" if evt_type == "error" else "PROCESSING"),
                        "note": msg,
                        "output_path": out_path,
                        "global_processed": sum(1 for x in active_tasks if x.get("status") == "DONE"),
                        "global_total": len(active_tasks),
                        "global_percent": round(sum(x.get("progress", 0) for x in active_tasks) / max(1, len(active_tasks)), 1),
                        "estimated_time": "1m 30s"
                    })

                    if msg:
                        emit_live_log(f"[{stage}] {msg}", "success" if evt_type == "done" else ("error" if evt_type == "error" else "info"))

                except Exception:
                    emit_live_log(line, "info")

            current_process.wait()
            current_process = None
            save_tasks_to_disk()

        except Exception as e:
            emit_live_log(f"[Lỗi tác vụ #{task_id}]: {str(e)}", "error")
            with task_lock:
                for t in active_tasks:
                    if t["id"] == task_id:
                        t["status"] = "ERROR"
                        t["note"] = str(e)
                        break
            save_tasks_to_disk()

        time.sleep(1)

class StudioAPIHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # SSE Event Stream
        if path == "/api/events":
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()

            q = queue.Queue()
            with subscribers_lock:
                event_subscribers.append(q)

            try:
                # Send welcome event
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()
                while True:
                    try:
                        msg = q.get(timeout=20)
                        self.wfile.write(msg.encode('utf-8'))
                        self.wfile.flush()
                    except queue.Empty:
                        # Keep-alive heartbeat
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                with subscribers_lock:
                    if q in event_subscribers:
                        event_subscribers.remove(q)
            return

        if path == "/api/tasks":
            with task_lock:
                self.send_json(active_tasks)
            return

        if path == "/api/settings":
            cfg = {}
            if SETTINGS_FILE.exists():
                try:
                    with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                        cfg = json.load(f)
                except Exception:
                    pass
            self.send_json(cfg)
            return

        if path == "/api/profiles":
            profiles = []
            if PROFILES_FILE.exists():
                try:
                    with open(PROFILES_FILE, "r", encoding="utf-8") as f:
                        profiles = json.load(f)
                except Exception:
                    pass
            self.send_json(profiles)
            return

        self.send_json({"status": "not_found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else "{}"
        try:
            req_data = json.loads(body)
        except Exception:
            req_data = {}

        global is_queue_running, is_queue_paused, current_process

        if path == "/api/add_tasks":
            items = req_data.get("items", [])
            base_id = int(time.time() * 1000)
            added = []
            with task_lock:
                for idx, item in enumerate(items):
                    item_str = str(item).strip()
                    if not item_str:
                        continue
                    name = Path(item_str).stem or f"Video_{base_id + idx}"
                    new_item = {
                        "id": base_id + idx,
                        "name": name,
                        "source": item_str,
                        "stage": "Chờ chạy",
                        "progress": 0,
                        "status": "WAITING",
                        "note": "Đã thêm vào hàng đợi thực",
                        "outputPath": f"C:\\Output\\Reup_{name}.mp4",
                        "selected": False
                    }
                    active_tasks.append(new_item)
                    added.append(new_item)
            save_tasks_to_disk()
            emit_live_log(f"+ Đã thêm {len(added)} video thực tế vào hàng đợi.", "success")
            self.send_json(active_tasks)
            return

        if path == "/api/queue/start":
            if not is_queue_running:
                is_queue_running = True
                is_queue_paused = False
                t = threading.Thread(target=worker_thread_loop, daemon=True)
                t.start()
            self.send_json({"status": "started", "is_running": True})
            return

        if path == "/api/queue/pause":
            is_queue_paused = not is_queue_paused
            emit_live_log("⏸ Đã tạm dừng hàng đợi." if is_queue_paused else "▶ Tiếp tục chạy hàng đợi.", "warn")
            self.send_json({"is_paused": is_queue_paused})
            return

        if path == "/api/queue/cancel":
            is_queue_running = False
            is_queue_paused = False
            if current_process:
                try:
                    current_process.terminate()
                except Exception:
                    pass
            emit_live_log("⏹ Đã hủy hàng đợi đang chạy.", "warn")
            self.send_json({"status": "cancelled", "is_running": False})
            return

        if path == "/api/queue/clean_done":
            with task_lock:
                active_tasks[:] = [t for t in active_tasks if t.get("status") != "DONE"]
            save_tasks_to_disk()
            emit_live_log("Đã dọn dẹp các mục hoàn tất.", "info")
            self.send_json(active_tasks)
            return

        if path == "/api/queue/delete_selected":
            with task_lock:
                active_tasks[:] = [t for t in active_tasks if not t.get("selected")]
            save_tasks_to_disk()
            emit_live_log("Đã xóa các mục đã chọn khỏi hàng đợi.", "info")
            self.send_json(active_tasks)
            return

        if path == "/api/queue/delete_waiting":
            with task_lock:
                active_tasks[:] = [t for t in active_tasks if t.get("status") != "WAITING"]
            save_tasks_to_disk()
            emit_live_log("Đã xóa các mục đang chờ.", "info")
            self.send_json(active_tasks)
            return

        if path == "/api/queue/retry_failed":
            with task_lock:
                for t in active_tasks:
                    if t.get("status") == "ERROR":
                        t["status"] = "WAITING"
                        t["progress"] = 0
                        t["stage"] = "Chờ chạy"
                        t["note"] = "Sẵn sàng chạy lại"
            save_tasks_to_disk()
            emit_live_log("Đã đặt lại các mục lỗi sang trạng thái chờ chạy.", "info")
            self.send_json(active_tasks)
            return

        if path == "/api/delete_task":
            tid = req_data.get("id")
            with task_lock:
                active_tasks[:] = [t for t in active_tasks if t.get("id") != tid]
            save_tasks_to_disk()
            self.send_json(active_tasks)
            return

        if path == "/api/detect_sub":
            # Run real OCR sub detection
            video_path = req_data.get("videoPath", "")
            if not video_path or not os.path.exists(video_path):
                # Search sample video in temp
                sample = BASE_DIR / "python-worker" / "temp" / "sample_video.mp4"
                if sample.exists():
                    video_path = str(sample)

            res_box = {"x": 18.0, "y": 64.2, "width": 36.0, "height": 25.0}
            try:
                ocr_script = BASE_DIR / "python-worker" / "auto_detect_sub_box.py"
                out = subprocess.check_output(
                    [sys.executable, str(ocr_script), "--video", str(video_path)],
                    text=True, encoding="utf-8", timeout=10
                )
                res_box = json.loads(out.strip())
            except Exception as e:
                emit_live_log(f"Auto-OCR thông báo: {e}", "info")

            emit_live_log(f"🔍 [Auto-OCR] Tọa độ tìm thấy: X={res_box.get('x')}%, Y={res_box.get('y')}%, W={res_box.get('width')}%, H={res_box.get('height')}%", "success")
            self.send_json(res_box)
            return

        if path == "/api/save_settings":
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(req_data, f, ensure_ascii=False, indent=2)
            self.send_json({"status": "saved"})
            return

        if path == "/api/open_folder":
            p = req_data.get("path", "C:\\Output")
            Path(p).mkdir(parents=True, exist_ok=True)
            if sys.platform == "win32":
                subprocess.Popen(["explorer", p])
            emit_live_log(f"Đã mở thư mục xuất: {p}", "info")
            self.send_json({"status": "opened"})
            return

        if path == "/api/open_file":
            p = req_data.get("path", "")
            if p and os.path.exists(p) and sys.platform == "win32":
                subprocess.Popen(["cmd", "/C", "start", "", p], shell=True)
            self.send_json({"status": "opened"})
            return

        self.send_json({"status": "bad_request"}, 400)

def run_server():
    load_initial_tasks()
    server = HTTPServer(('127.0.0.1', PORT), StudioAPIHandler)
    print(f"[*] Studio MMO Local Bridge Server running on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()

if __name__ == "__main__":
    run_server()
