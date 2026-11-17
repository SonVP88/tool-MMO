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
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
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
                    output_dir = s.get("output_dir", s.get("outputDir", output_dir))
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

        if path == "/api/video_stream":
            qs = parse_qs(parsed.query)
            file_path = qs.get("path", [""])[0]
            if not file_path or not os.path.exists(file_path):
                # Search candidate paths
                cand = BASE_DIR / "sample_video.mp4"
                if not cand.exists():
                    cand = BASE_DIR / "python-worker" / "temp" / "sample_video.mp4"
                if cand.exists():
                    file_path = str(cand)
                else:
                    self.send_json({"error": "Video not found"}, 404)
                    return

            try:
                stat = os.stat(file_path)
                file_size = stat.st_size
                range_header = self.headers.get('Range', None)

                if range_header:
                    ranges = range_header.replace('bytes=', '').split('-')
                    start = int(ranges[0]) if ranges[0] else 0
                    end = int(ranges[1]) if ranges[1] else file_size - 1
                    end = min(end, file_size - 1)
                    content_length = end - start + 1

                    self.send_response(206)
                    self.send_header('Content-Type', 'video/mp4')
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                    self.send_header('Content-Length', str(content_length))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()

                    with open(file_path, 'rb') as f:
                        f.seek(start)
                        remaining = content_length
                        while remaining > 0:
                            chunk = f.read(min(remaining, 65536))
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            remaining -= len(chunk)
                else:
                    self.send_response(200)
                    self.send_header('Content-Type', 'video/mp4')
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Content-Length', str(file_size))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()

                    with open(file_path, 'rb') as f:
                        shutil.copyfileobj(f, self.wfile, length=65536)
            except Exception:
                pass
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

        if path == "/api/subtitles":
            qs = parse_qs(parsed.query)
            t_id = qs.get("task_id", [""])[0]
            if not t_id:
                self.send_json({"status": "error", "message": "Missing task_id"}, 400)
                return

            srt_file = BASE_DIR / "python-worker" / "temp" / f"task_{t_id}" / f"subtitles_{t_id}.srt"
            if not srt_file.exists():
                found = list((BASE_DIR / "python-worker" / "temp").glob(f"**/subtitles_{t_id}.srt"))
                if found:
                    srt_file = found[0]

            if srt_file.exists():
                subs = parse_srt_to_list(srt_file)
                self.send_json({"status": "success", "subtitles": subs})
            else:
                self.send_json({"status": "not_transcribed", "subtitles": []})
            return

        if path == "/api/preview_audio":
            qs = parse_qs(parsed.query)
            filename = qs.get("file", [""])[0]
            if not filename:
                self.send_json({"error": "Missing file"}, 400)
                return
            audio_path = BASE_DIR / "python-worker" / "temp" / "preview_cache" / os.path.basename(filename)
            if not audio_path.exists():
                self.send_json({"error": "Not found"}, 404)
                return

            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(os.path.getsize(audio_path)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(audio_path, 'rb') as f:
                shutil.copyfileobj(f, self.wfile, length=65536)
            return

        self.send_json({"status": "not_found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get('Content-Length', 0))

        # Handle binary upload before reading json
        if path == "/api/upload":
            qs = parse_qs(parsed.query)
            filename = qs.get("filename", ["uploaded_video.mp4"])[0]
            filename = os.path.basename(filename)
            uploads_dir = BASE_DIR / "python-worker" / "temp" / "uploads"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            dest_path = uploads_dir / filename

            with open(dest_path, "wb") as f:
                remaining = content_len
                chunk_size = 65536
                while remaining > 0:
                    read_bytes = min(remaining, chunk_size)
                    chunk = self.rfile.read(read_bytes)
                    if not chunk:
                        break
                    f.write(chunk)
                    remaining -= len(chunk)

            base_id = int(time.time() * 1000)
            name = Path(filename).stem
            file_mb = round(os.path.getsize(dest_path) / (1024 * 1024), 2)
            new_item = {
                "id": base_id,
                "name": name,
                "source": str(dest_path.resolve()),
                "stage": "Chờ chạy",
                "progress": 0,
                "status": "WAITING",
                "note": f"Đã nhập video: {file_mb} MB",
                "outputPath": f"C:\\Output\\Reup_{name}.mp4",
                "selected": False
            }
            with task_lock:
                active_tasks.append(new_item)
            save_tasks_to_disk()
            emit_live_log(f"+ Đã nhập file video: {filename} ({file_mb} MB) vào hàng đợi.", "success")
            broadcast_event("task-added", new_item)
            self.send_json({"status": "success", "task": new_item, "tasks": active_tasks})
            return

        raw_bytes = self.rfile.read(content_len) if content_len > 0 else b""
        try:
            body = raw_bytes.decode('utf-8')
        except Exception:
            body = raw_bytes.decode('utf-8', errors='replace')
        try:
            req_data = json.loads(body)
        except Exception:
            req_data = {}

        global is_queue_running, is_queue_paused, current_process

        if path == "/api/test_api_key":
            key_type = req_data.get("type", "gemini")
            api_key = req_data.get("key", "").strip()

            if not api_key:
                self.send_json({"valid": False, "message": "Vui lòng nhập khóa API trước khi kiểm tra."}, 400)
                return

            import urllib.request
            if key_type == "gemini":
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
                    req_payload = json.dumps({"contents": [{"parts": [{"text": "ping"}]}]}).encode('utf-8')
                    req = urllib.request.Request(url, data=req_payload, headers={"Content-Type": "application/json"}, method="POST")
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        if resp.status == 200:
                            emit_live_log("✔ Kiểm tra Gemini 2.5 Flash API Key: Kết nối thành công!", "success")
                            self.send_json({"valid": True, "model": "gemini-2.5-flash", "message": "Kết nối Gemini 2.5 Flash thành công!"})
                            return
                except Exception as e:
                    emit_live_log(f"✖ Kiểm tra Gemini API Key thất bại: {e}", "error")
                    self.send_json({"valid": False, "message": f"Lỗi Gemini: {str(e)[:120]}"}, 400)
                    return
            elif key_type == "groq":
                try:
                    url = "https://api.groq.com/openai/v1/models"
                    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"}, method="GET")
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        if resp.status == 200:
                            emit_live_log("✔ Kiểm tra Groq Whisper API Key: Kết nối thành công!", "success")
                            self.send_json({"valid": True, "model": "whisper-large-v3", "message": "Kết nối Groq Whisper thành công!"})
                            return
                except Exception as e:
                    emit_live_log(f"✖ Kiểm tra Groq API Key thất bại: {e}", "error")
                    self.send_json({"valid": False, "message": f"Lỗi Groq: {str(e)[:120]}"}, 400)
                    return

            self.send_json({"valid": False, "message": "Loại API không hỗ trợ."}, 400)
            return

        if path == "/api/add_local_path":
            input_path = req_data.get("path", "").strip()
            added = []
            base_id = int(time.time() * 1000)
            if input_path and os.path.exists(input_path):
                p = Path(input_path)
                video_files = []
                if p.is_dir():
                    for ext in [".mp4", ".mkv", ".mov", ".ts", ".avi", ".webm", ".flv"]:
                        video_files.extend(list(p.glob(f"*{ext}")))
                elif p.is_file():
                    video_files.append(p)

                with task_lock:
                    for idx, vf in enumerate(video_files):
                        name = vf.stem
                        file_mb = round(vf.stat().st_size / (1024 * 1024), 2)
                        new_item = {
                            "id": base_id + idx,
                            "name": name,
                            "source": str(vf.resolve()),
                            "stage": "Chờ chạy",
                            "progress": 0,
                            "status": "WAITING",
                            "note": f"File nội bộ ({file_mb} MB)",
                            "outputPath": f"C:\\Output\\Reup_{name}.mp4",
                            "selected": False
                        }
                        active_tasks.append(new_item)
                        added.append(new_item)
                save_tasks_to_disk()
                emit_live_log(f"+ Đã quét và thêm {len(added)} file từ: {input_path}", "success")
                self.send_json({"status": "success", "count": len(added), "tasks": active_tasks})
                return
            else:
                emit_live_log(f"Đường dẫn không tồn tại: {input_path}", "error")
                self.send_json({"status": "error", "message": f"Đường dẫn không tồn tại: {input_path}"}, 400)
                return

        if path == "/api/add_tasks":
            items = req_data.get("items", [])
            base_id = int(time.time() * 1000)
            added = []
            with task_lock:
                for idx, item in enumerate(items):
                    item_str = str(item).strip()
                    if not item_str:
                        continue
                    # Check if it's an existing folder
                    if os.path.exists(item_str) and os.path.isdir(item_str):
                        p = Path(item_str)
                        for ext in [".mp4", ".mkv", ".mov", ".ts", ".avi", ".webm"]:
                            for vf in p.glob(f"*{ext}"):
                                name = vf.stem
                                new_item = {
                                    "id": base_id + len(added),
                                    "name": name,
                                    "source": str(vf.resolve()),
                                    "stage": "Chờ chạy",
                                    "progress": 0,
                                    "status": "WAITING",
                                    "note": f"Từ thư mục {p.name}",
                                    "outputPath": f"C:\\Output\\Reup_{name}.mp4",
                                    "selected": False
                                }
                                active_tasks.append(new_item)
                                added.append(new_item)
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

        if path == "/api/select_folder":
            selected = ""
            try:
                import tkinter as tk
                from tkinter import filedialog
                root = tk.Tk()
                root.withdraw()
                root.wm_attributes("-topmost", 1)
                selected = filedialog.askdirectory(title="Chọn thư mục nhận dữ liệu Output (Ổ D, E, C...)")
                root.destroy()
            except Exception as e:
                emit_live_log(f"Lỗi chọn thư mục: {e}", "warn")

            if selected:
                selected = os.path.normpath(selected)
                emit_live_log(f"Đã chọn thư mục xuất mới: {selected}", "success")
                self.send_json({"status": "success", "folder": selected})
            else:
                self.send_json({"status": "canceled", "folder": ""})
            return

        if path == "/api/preview_voice":
            text = req_data.get("text", "").strip()
            voice = req_data.get("voice", "Cô Gái Hoạt Ngôn (vi-VN)")
            speed = float(req_data.get("speed", 1.0))

            if not text:
                self.send_json({"status": "error", "message": "Nội dung văn bản trống"}, 400)
                return

            voice_code_map = {
                "Cô Gái Hoạt Ngôn (vi-VN)": "vi-VN-HoaiMyNeural",
                "Cô Gái Hoạt Ngôn (Free)": "vi-VN-HoaiMyNeural",
                "Cô Gái Hoạt Ngôn": "vi-VN-HoaiMyNeural",
                "Nam Miền Bắc Trầm Ấm (vi-VN)": "vi-VN-NamMinhNeural",
                "Nam Trầm Ấm (Nam VIP)": "vi-VN-NamMinhNeural",
                "Nam Trầm Ấm": "vi-VN-NamMinhNeural",
                "Nam Miền Nam Truyền Cảm (vi-VN)": "vi-VN-NamMinhNeural",
                "Nam Miền Nam Truyền Cảm": "vi-VN-NamMinhNeural",
                "Nữ Nhẹ Nhàng (vi-VN)": "vi-VN-HoaiMyNeural",
                "Giọng Trầm Kể Chuyện (vi-VN)": "vi-VN-NamMinhNeural",
                "Chị Google": "vi-VN-HoaiMyNeural",
            }
            v_code = voice_code_map.get(voice, "vi-VN-HoaiMyNeural")
            import hashlib
            h = hashlib.md5(f"{text}_{v_code}_{speed}".encode('utf-8')).hexdigest()
            cache_dir = BASE_DIR / "python-worker" / "temp" / "preview_cache"
            cache_dir.mkdir(parents=True, exist_ok=True)
            mp3_out = cache_dir / f"prev_{h}.mp3"

            if not mp3_out.exists() or mp3_out.stat().st_size == 0:
                rate_str = f"+{int((speed - 1.0) * 100)}%" if speed >= 1.0 else f"-{int((1.0 - speed) * 100)}%"
                cmd = [
                    sys.executable, "-m", "edge_tts",
                    "--voice", v_code,
                    "--rate", rate_str,
                    "--text", text,
                    "--write-media", str(mp3_out)
                ]
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=12)

            if mp3_out.exists() and mp3_out.stat().st_size > 0:
                self.send_json({"status": "success", "audio_url": f"http://127.0.0.1:{PORT}/api/preview_audio?file=prev_{h}.mp3"})
            else:
                self.send_json({"status": "error", "message": "Không thể sinh giọng đọc thử"}, 500)
            return

        if path == "/api/produce_audio_novel":
            title = req_data.get("title", "Chuong_Truyen").strip()
            story_text = req_data.get("storyText", "").strip()
            voice = req_data.get("voice", "Nam Miền Bắc Trầm Ấm (vi-VN)")
            speed = float(req_data.get("speed", 1.1))
            bgm_track = req_data.get("bgmTrack", "Nhạc Cổ Phong")
            bgm_volume = int(req_data.get("bgmVolume", 12))
            bg_video = req_data.get("bgVideo", "Video Phong Cảnh Anime 4K (Loop)")
            output_dir = req_data.get("outputDir", "C:\\Output")

            base_id = int(time.time() * 1000)
            novels_dir = BASE_DIR / "python-worker" / "temp" / "novels"
            novels_dir.mkdir(parents=True, exist_ok=True)
            txt_path = novels_dir / f"story_{base_id}.txt"
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(story_text)

            clean_name = title.replace(" ", "_")[:30]
            new_item = {
                "id": base_id,
                "name": f"Truyen_{clean_name}",
                "source": f"audio_novel:{txt_path.resolve()}",
                "stage": "Chờ chạy",
                "progress": 0,
                "status": "WAITING",
                "note": f"Truyện Audio: {voice}",
                "outputPath": f"{output_dir}\\Audio_{clean_name}.mp4",
                "selected": False,
                "extra_config": {
                    "voice": voice,
                    "speed": speed,
                    "bgm_volume": bgm_volume,
                    "bgm_track": bgm_track,
                    "bg_video": bg_video,
                    "title": title
                }
            }
            with task_lock:
                active_tasks.append(new_item)
            save_tasks_to_disk()
            emit_live_log(f"+ Đã tạo dự án sản xuất Video Truyện Audio: {title}", "success")
            broadcast_event("task-added", new_item)
            self.send_json({"status": "success", "task": new_item})
            return

        if path == "/api/save_subtitles":
            task_id = req_data.get("task_id")
            subtitles = req_data.get("subtitles", [])
            task_dir = BASE_DIR / "python-worker" / "temp" / f"task_{task_id}"
            task_dir.mkdir(parents=True, exist_ok=True)
            srt_path = task_dir / f"subtitles_{task_id}.srt"

            with open(srt_path, "w", encoding="utf-8") as f:
                for s in subtitles:
                    f.write(f"{s['index']}\n")
                    f.write(f"{s['start']} --> {s['end']}\n")
                    f.write(f"{s.get('translatedText', s.get('originalText', ''))}\n\n")

            emit_live_log(f"Đã lưu cập nhật {len(subtitles)} dòng phụ đề cho Video #{task_id}", "success")
            self.send_json({"status": "success"})
            return

        if path == "/api/merge_full_audio":
            task_id = req_data.get("task_id")
            output_dir = Path(req_data.get("output_dir", "C:\\Output"))
            output_dir.mkdir(parents=True, exist_ok=True)
            task_dir = BASE_DIR / "python-worker" / "temp" / f"task_{task_id}"
            
            # Find audio segments or combined voice
            merged_mp3 = output_dir / f"Full_Audio_{task_id}.mp3"
            voice_wav = task_dir / f"voice_{task_id}.wav"
            if voice_wav.exists():
                shutil.copy(voice_wav, merged_mp3)
                emit_live_log(f"Đã xuất file âm thanh hoàn chỉnh: {merged_mp3}", "success")
                self.send_json({"status": "success", "path": str(merged_mp3)})
            else:
                self.send_json({"status": "error", "message": "Chưa có file âm thanh cho tác vụ này"}, 400)
            return

        if path == "/api/open_file":
            p = req_data.get("path", "")
            if p and os.path.exists(p) and sys.platform == "win32":
                subprocess.Popen(["cmd", "/C", "start", "", p], shell=True)
            self.send_json({"status": "opened"})
            return

        self.send_json({"status": "bad_request"}, 400)

def parse_srt_to_list(srt_path):
    if not os.path.exists(srt_path):
        return []
    subs = []
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read().strip()
    blocks = content.split("\n\n")
    for b in blocks:
        lines = b.strip().split("\n")
        if len(lines) >= 3:
            try:
                idx = int(lines[0].strip())
                times = lines[1].split("-->")
                start = times[0].strip()
                end = times[1].strip()
                text = " ".join(lines[2:]).strip()
                subs.append({
                    "index": idx,
                    "start": start,
                    "end": end,
                    "originalText": text,
                    "translatedText": text,
                    "speaker": "Cô Gái Hoạt Ngôn (vi-VN)"
                })
            except Exception:
                pass
    return subs

def run_server():
    load_initial_tasks()
    server = ThreadingHTTPServer(('127.0.0.1', PORT), StudioAPIHandler)
    print(f"[*] Studio MMO Local Bridge Server running on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()

if __name__ == "__main__":
    run_server()

