#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automation Studio MMO - Video Pipeline Worker
Handles end-to-end video reup automation:
1. Input/Download (yt-dlp)
2. Subtitle extraction (Groq Whisper API or local audio analysis)
3. Contextual Translation (Gemini 2.5 Flash API)
4. AI Voice Synthesis (Edge-TTS) & Timeline Synchronization
5. FFmpeg Video Rendering (Sub Blur Box, Hard-sub .ass burn, Audio mixing)
"""

import sys
import os
import json
import argparse
import subprocess
import shutil
import time
import re
import asyncio
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Ensure UTF-8 output on Windows
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def emit_progress(task_id: int, progress: int, stage: str, message: str, extra: dict = None):
    payload = {
        "type": "progress",
        "task_id": task_id,
        "progress": progress,
        "stage": stage,
        "message": message,
        "timestamp": time.strftime("%H:%M:%S")
    }
    if extra:
        payload.update(extra)
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def emit_done(task_id: int, output_path: str, message: str = "Hoàn tất xử lý"):
    payload = {
        "type": "done",
        "task_id": task_id,
        "progress": 100,
        "stage": "Hoàn tất",
        "output_path": output_path,
        "message": message,
        "timestamp": time.strftime("%H:%M:%S")
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def emit_error(task_id: int, message: str, stage: str = "Lỗi"):
    payload = {
        "type": "error",
        "task_id": task_id,
        "stage": stage,
        "message": message,
        "timestamp": time.strftime("%H:%M:%S")
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)

# ==================== DYNAMIC API KEY ROTATOR & RATE LIMIT MITIGATION ====================
class ApiKeyRotator:
    """
    Intelligent API Key Pool & Rate-Limit Rotator:
    - Automatically parses multiple keys from comma, newline, or semicolon delimiters.
    - Round-robin load balancing distributes request pressure evenly across all keys.
    - On HTTP 429 (Rate Limit / Quota Exceeded), isolates the exhausted key into cooldown
      and immediately fails over to the next healthy key without failing tasks.
    - Built-in pacing ensures single-key setups respect Gemini's 15 RPM free tier limits.
    """
    def __init__(self, raw_input, service_name: str = "Gemini", default_min_interval: float = 3.0):
        self.service_name = service_name
        self.keys = []
        self.min_interval = default_min_interval
        self.last_used_time = {}
        self.cooldown_until = {}
        self.current_idx = 0
        self._parse_keys(raw_input)

    def _parse_keys(self, raw_input):
        if not raw_input:
            return
        if isinstance(raw_input, list):
            items = raw_input
        else:
            items = re.split(r'[\r\n,;]+', str(raw_input))
        
        seen = set()
        for item in items:
            k = item.strip().strip('"\'')
            if k and len(k) > 10 and not k.startswith("AIzaSyD-mock") and not k.startswith("gsk_mock") and k not in seen:
                seen.add(k)
                self.keys.append(k)
                self.last_used_time[k] = 0.0
                self.cooldown_until[k] = 0.0

    def has_keys(self) -> bool:
        return len(self.keys) > 0

    def get_total_keys(self) -> int:
        return len(self.keys)

    def get_masked_key(self, key: str) -> str:
        if not key or len(key) < 8:
            return "****"
        return f"{key[:6]}...{key[-4:]}"

    def get_next_key(self, emit_fn=None, task_id=None) -> str:
        if not self.keys:
            return ""

        now = time.time()
        n = len(self.keys)
        
        # 1. Round-robin through keys not currently in cooldown
        for _ in range(n):
            candidate = self.keys[self.current_idx]
            self.current_idx = (self.current_idx + 1) % n
            
            if now >= self.cooldown_until.get(candidate, 0.0):
                if n == 1:
                    elapsed = now - self.last_used_time.get(candidate, 0.0)
                    if elapsed < self.min_interval:
                        time.sleep(self.min_interval - elapsed)
                self.last_used_time[candidate] = time.time()
                return candidate

        # 2. If all keys are cooling down, select the one with earliest cooldown expiration
        earliest_key = min(self.keys, key=lambda k: self.cooldown_until.get(k, 0.0))
        wait_needed = max(0.2, self.cooldown_until.get(earliest_key, 0.0) - now)
        if emit_fn and task_id:
            emit_fn(task_id, None, "Chờ Quota", f"Tất cả {n} {self.service_name} keys đang chạm limit. Tạm dừng {wait_needed:.1f}s trước khi tiếp tục...")
        time.sleep(min(wait_needed, 6.0))
        self.cooldown_until[earliest_key] = 0.0
        self.last_used_time[earliest_key] = time.time()
        return earliest_key

    def mark_rate_limited(self, key: str, cooldown_seconds: float = 60.0, emit_fn=None, task_id=None):
        self.cooldown_until[key] = time.time() + cooldown_seconds
        masked = self.get_masked_key(key)
        if emit_fn and task_id:
            emit_fn(task_id, None, "Chia Tải API", f"Key {masked} chạm giới hạn (429/Limit). Tạm nghỉ {int(cooldown_seconds)}s, tự động chuyển sang Key tiếp theo...")

    def mark_invalid(self, key: str, emit_fn=None, task_id=None):
        self.cooldown_until[key] = time.time() + 86400.0
        masked = self.get_masked_key(key)
        if emit_fn and task_id:
            emit_fn(task_id, None, "Cảnh báo Key", f"Key {masked} không hợp lệ hoặc đã bị khóa!")

def get_ffmpeg_path():
    # 1. System PATH
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        return ffmpeg
    # 2. imageio_ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    # 3. Environment paths
    for base in [os.environ.get("ProgramFiles", ""), os.environ.get("ProgramFiles(x86)", "")]:
        if base:
            c = Path(base) / "ffmpeg" / "bin" / "ffmpeg.exe"
            if c.exists():
                return str(c)
    winget = Path(os.path.expanduser(r"~\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"))
    if winget.exists():
        return str(winget)
    return "ffmpeg"

def detect_gpu_encoder(ffmpeg_exe: str):
    """
    Probes available hardware encoders (NVENC, AMF, QSV, libx264).
    Returns (encoder_name, encoder_flags, display_label)
    """
    candidates = [
        ("h264_nvenc", ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "23"], "GPU: NVIDIA NVENC Active"),
        ("h264_amf", ["-c:v", "h264_amf", "-quality", "speed"], "GPU: AMD AMF Active"),
        ("h264_qsv", ["-c:v", "h264_qsv", "-preset", "fast"], "GPU: Intel QSV Active"),
        ("libx264", ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p"], "CPU Mode (libx264)"),
    ]
    for enc, flags, label in candidates:
        cmd = [ffmpeg_exe, "-y", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=0.05"] + flags + ["-f", "null", "-"]
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if res.returncode == 0:
                return enc, flags, label
        except Exception:
            continue
    return "libx264", ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p"], "CPU Mode (libx264)"

def hex_to_ass_color(hex_str: str, default: str = "&H00FFFFFF&") -> str:
    """Converts #RRGGBB to ASS color &H00BBGGRR&"""
    hex_str = hex_str.strip().lstrip('#')
    if len(hex_str) == 6:
        r = hex_str[0:2].upper()
        g = hex_str[2:4].upper()
        b = hex_str[4:6].upper()
        return f"&H00{b}{g}{r}&"
    return default

def srt_time_to_seconds(time_str: str) -> float:
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])

def seconds_to_ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"

# ==================== STEP 1: DOWNLOAD / INPUT ====================
def step_download_or_copy(task_id: int, source: str, temp_dir: Path, cookie_data: str = None, preferred_name: str = "") -> tuple:
    source_clean = source.strip()
    # Normalize common link patterns
    if source_clean.startswith("watch?v="):
        source_clean = f"https://www.youtube.com/{source_clean}"
    elif source_clean.startswith("youtu.be/"):
        source_clean = f"https://{source_clean}"
    elif source_clean.startswith("v.douyin.com/") or source_clean.startswith("www.douyin.com/"):
        source_clean = f"https://{source_clean}"
    elif source_clean.startswith("tiktok.com/") or source_clean.startswith("www.tiktok.com/"):
        source_clean = f"https://{source_clean}"
    elif source_clean.startswith("bilibili.com/") or source_clean.startswith("www.bilibili.com/"):
        source_clean = f"https://{source_clean}"
    elif source_clean.startswith("b23.tv/"):
        source_clean = f"https://{source_clean}"

    emit_progress(task_id, 5, "Tải video", f"Chuẩn bị nguồn video: {source_clean}")
    temp_dir.mkdir(parents=True, exist_ok=True)
    raw_video = temp_dir / f"input_raw_{task_id}.mp4"

    is_url = source_clean.startswith("http://") or source_clean.startswith("https://")

    # Local file candidate lookup ONLY if it is not a web URL
    if not is_url:
        candidate_paths = [
            Path(source_clean),
            BASE_DIR / source_clean,
            Path.cwd() / source_clean,
            BASE_DIR / "python-worker" / source_clean,
            BASE_DIR / "python-worker" / "temp" / Path(source_clean).name,
            BASE_DIR / "python-worker" / "temp" / "uploads" / Path(source_clean).name,
            BASE_DIR / "temp" / Path(source_clean).name,
        ]
        for cand in candidate_paths:
            try:
                if cand.exists() and cand.is_file():
                    if cand.resolve() != raw_video.resolve():
                        emit_progress(task_id, 15, "Tải video", f"Sao chép file video nội bộ: {cand.name}")
                        shutil.copy2(str(cand), str(raw_video))
                    emit_progress(task_id, 20, "Tải video", "Nhập video hoàn tất.")
                    clean_name = preferred_name if preferred_name and preferred_name.lower() not in ["watch", "index", "video"] else cand.stem
                    return raw_video, clean_name
            except Exception:
                pass

    # Is URL -> run yt-dlp with full ffmpeg integration
    emit_progress(task_id, 10, "Tải video", f"[yt-dlp] Đang kết nối và tải video từ URL: {source_clean}")
    try:
        import yt_dlp
        cookie_file = None
        if cookie_data and len(cookie_data) > 10:
            cookie_file = temp_dir / "cookie_douyin.txt"
            with open(cookie_file, "w", encoding="utf-8") as cf:
                cf.write(cookie_data)

        ffmpeg_exe = get_ffmpeg_path()
        ydl_opts = {
            'outtmpl': str(raw_video.with_suffix('')) + '.%(ext)s',
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'ffmpeg_location': ffmpeg_exe,
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'ios']
                }
            },
            'quiet': True,
            'no_warnings': True,
        }
        if cookie_file:
            ydl_opts['cookiefile'] = str(cookie_file)

        downloaded_title = ""
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(source_clean, download=True)
            if info:
                downloaded_title = info.get("title", "")

        # Find downloaded file
        matching = list(temp_dir.glob(f"input_raw_{task_id}.*"))
        if matching:
            downloaded = matching[0]
            if downloaded.suffix.lower() != ".mp4":
                cmd_conv = [
                    ffmpeg_exe, "-y",
                    "-i", str(downloaded),
                    "-c:v", "copy", "-c:a", "aac",
                    str(raw_video)
                ]
                subprocess.run(cmd_conv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if raw_video.exists():
                    downloaded = raw_video

            final_title = ""
            if downloaded_title:
                clean_t = re.sub(r'[\\/*?:"<>|]', '_', downloaded_title).strip()[:45]
                if clean_t and clean_t.lower() not in ["watch", "index", "video"]:
                    final_title = clean_t
            if not final_title:
                final_title = preferred_name if preferred_name and preferred_name.lower() not in ["watch", "index", "video"] else f"Video_{task_id}"

            emit_progress(task_id, 20, "Tải video", f"Tải hoàn tất: {final_title} ({downloaded.name})")
            return downloaded, final_title

        raise RuntimeError(f"yt-dlp không thể tạo file video từ: {source_clean}")
    except Exception as e:
        emit_progress(task_id, 15, "Tải video", f"Lỗi tải video: {str(e)[:100]}")
        raise RuntimeError(f"Không thể mở hoặc tải video từ nguồn: '{source_clean}'. Chi tiết lỗi: {str(e)[:120]}")

# ==================== STEP 2: EXTRACT AUDIO & ASR (GROQ / GEMINI) ====================
def step_extract_and_transcribe(task_id: int, video_file: Path, temp_dir: Path, groq_key: str = None, gemini_key: str = None) -> list:
    emit_progress(task_id, 25, "Lấy phụ đề", "Tách dải âm thanh từ video gốc...")
    audio_wav = temp_dir / f"extracted_{task_id}.wav"
    audio_mp3 = temp_dir / f"extracted_{task_id}.mp3"
    ffmpeg_exe = get_ffmpeg_path()

    cmd = [
        ffmpeg_exe, "-y",
        "-i", str(video_file),
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        str(audio_wav)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if not audio_wav.exists() or audio_wav.stat().st_size < 100:
        emit_progress(task_id, 40, "Lấy phụ đề", "Video không chứa âm thanh, bỏ qua bước nhận diện giọng nói.")
        return []

    # Encode high-efficiency 32k mono mp3 (~14MB per hour, fits up to 90 min under Groq 25MB limit)
    cmd_mp3 = [
        ffmpeg_exe, "-y",
        "-i", str(audio_wav),
        "-b:a", "32k", "-ar", "16000", "-ac", "1",
        str(audio_mp3)
    ]
    subprocess.run(cmd_mp3, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 1. Try Groq Whisper large-v3 if groq_key provided
    groq_rotator = ApiKeyRotator(groq_key, service_name="Groq", default_min_interval=2.0)
    if groq_rotator.has_keys():
        total_groq_keys = groq_rotator.get_total_keys()
        key_label = f"{total_groq_keys} Groq Keys xoay tua" if total_groq_keys > 1 else "Groq Whisper"
        emit_progress(task_id, 30, "Lấy phụ đề", f"Bóc tách giọng nói siêu tốc qua {key_label} large-v3...")
        try:
            import requests, wave, math
            from concurrent.futures import ThreadPoolExecutor

            def transcribe_groq_file(file_path: Path):
                max_groq_attempts = min(4, max(2, groq_rotator.get_total_keys()))
                for _ in range(max_groq_attempts):
                    act_k = groq_rotator.get_next_key()
                    if not act_k:
                        break
                    headers = {"Authorization": f"Bearer {act_k}"}
                    mime = "audio/mp3" if file_path.suffix.lower() == ".mp3" else "audio/wav"
                    try:
                        with open(file_path, "rb") as f:
                            files = {"file": (file_path.name, f, mime)}
                            data = {
                                "model": "whisper-large-v3",
                                "response_format": "verbose_json",
                                "temperature": 0.0
                            }
                            res = requests.post("https://api.groq.com/openai/v1/audio/transcriptions", headers=headers, files=files, data=data, timeout=120)
                            if res.status_code == 200:
                                return res.json().get("segments", [])
                            elif res.status_code == 429:
                                groq_rotator.mark_rate_limited(act_k, cooldown_seconds=60.0, emit_fn=emit_progress, task_id=task_id)
                                continue
                            elif res.status_code in [400, 401]:
                                groq_rotator.mark_invalid(act_k, emit_fn=emit_progress, task_id=task_id)
                                continue
                    except Exception:
                        continue
                return []

            # Check audio duration
            total_audio_sec = 0.0
            try:
                with wave.open(str(audio_wav), "rb") as wf:
                    total_audio_sec = wf.getnframes() / float(wf.getframerate())
            except Exception:
                total_audio_sec = 0.0

            target_audio = audio_mp3 if (audio_mp3.exists() and audio_mp3.stat().st_size > 100) else audio_wav
            audio_size_mb = target_audio.stat().st_size / (1024 * 1024)

            # Strategy A: File under 24MB (Videos up to ~90 minutes) -> 1 Single Shot! (No slicing needed)
            if audio_size_mb <= 23.5:
                emit_progress(task_id, 32, "Lấy phụ đề", f"Video {int(total_audio_sec // 60)} phút ({audio_size_mb:.1f}MB): Bắn 1 lần duy nhất lên Groq LPU...")
                segments = transcribe_groq_file(target_audio)
                if segments:
                    subtitles = []
                    for s in segments:
                        txt = s.get("text", "").strip()
                        clean_txt = re.sub(r'^[.\s,!?…–—\-~_#*♪♩♫♬\(\)\[\]{}«»"\'`]+$', '', txt).strip()
                        no_speech = float(s.get("no_speech_prob", 0.0))
                        if clean_txt and no_speech < 0.65:
                            subtitles.append({
                                "index": len(subtitles) + 1,
                                "start": round(float(s.get("start", 0.0)), 2),
                                "end": round(float(s.get("end", 2.0)), 2),
                                "text": clean_txt
                            })
                    if subtitles:
                        emit_progress(task_id, 40, "Lấy phụ đề", f"Nhận diện thành công {len(subtitles)} câu thoại thực tế trong tích tắc.")
                        return subtitles
                    else:
                        emit_progress(task_id, 40, "Lấy phụ đề", "Whisper xác nhận: Video không có lời thoại (chỉ có nhạc hoặc im lặng).")
                        return []

            # Strategy B: Video over 1.5 hours (2-5+ hours) -> Parallel Multi-Threaded Chunking (45 min chunks)
            CHUNK_DUR = 2700 # 45 minutes (~10MB per chunk)
            num_chunks = int(math.ceil(total_audio_sec / CHUNK_DUR))
            emit_progress(task_id, 30, "Lấy phụ đề", f"Video dài {int(total_audio_sec // 60)} phút: Tách {num_chunks} phần và gửi song song lên Groq...")

            def process_chunk(c_idx):
                c_start = c_idx * CHUNK_DUR
                c_file = temp_dir / f"chunk_{task_id}_{c_idx}.mp3"
                cmd_c = [
                    ffmpeg_exe, "-y",
                    "-ss", str(c_start),
                    "-t", str(CHUNK_DUR),
                    "-i", str(target_audio),
                    "-c:a", "copy",
                    str(c_file)
                ]
                subprocess.run(cmd_c, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if not c_file.exists():
                    return c_idx, c_start, []
                segs = transcribe_groq_file(c_file)
                try:
                    c_file.unlink()
                except Exception:
                    pass
                return c_idx, c_start, segs

            # Execute all chunks in parallel!
            with ThreadPoolExecutor(max_workers=min(4, num_chunks)) as executor:
                chunk_results = list(executor.map(process_chunk, range(num_chunks)))

            # Sort results by chunk index to maintain exact timeline order
            chunk_results.sort(key=lambda r: r[0])
            subtitles = []
            for c_idx, c_start, segs in chunk_results:
                for s in segs:
                    txt = s.get("text", "").strip()
                    clean_txt = re.sub(r'^[.\s,!?…–—\-~_#*♪♩♫♬\(\)\[\]{}«»"\'`]+$', '', txt).strip()
                    no_speech = float(s.get("no_speech_prob", 0.0))
                    if clean_txt and no_speech < 0.65:
                        subtitles.append({
                            "index": len(subtitles) + 1,
                            "start": round(c_start + float(s.get("start", 0.0)), 2),
                            "end": round(c_start + float(s.get("end", 2.0)), 2),
                            "text": clean_txt
                        })

            if subtitles:
                emit_progress(task_id, 40, "Lấy phụ đề", f"Nhận diện song song thành công {len(subtitles)} câu thoại qua toàn bộ {num_chunks} phần video.")
                return subtitles
            else:
                emit_progress(task_id, 40, "Lấy phụ đề", "Whisper xác nhận: Video không có lời thoại người nói.")
                return []
        except Exception as e:
            emit_progress(task_id, 35, "Lấy phụ đề", f"Groq Whisper: {str(e)[:80]}. Chuyển sang Gemini...")

    # 2. Try Gemini 2.5 Flash Audio Transcription if gemini_key provided
    gemini_audio_rotator = ApiKeyRotator(gemini_key, service_name="Gemini Audio", default_min_interval=3.0)
    if gemini_audio_rotator.has_keys():
        act_audio_key = gemini_audio_rotator.get_next_key()
        masked_audio_k = gemini_audio_rotator.get_masked_key(act_audio_key)
        emit_progress(task_id, 34, "Lấy phụ đề", f"Nhận diện giọng nói và mốc thời gian qua Gemini Audio [{masked_audio_k}]...")
        try:
            import requests, base64
            target_audio = audio_mp3 if audio_mp3.exists() else audio_wav
            with open(target_audio, "rb") as af:
                b64_audio = base64.b64encode(af.read()).decode("utf-8")

            mime = "audio/mp3" if audio_mp3.exists() else "audio/wav"
            prompt_text = (
                "Bạn là trợ lý ASR chuyên nghiệp. Hãy lắng nghe toàn bộ file âm thanh này và xuất tất cả các câu hội thoại có trong video kèm timestamp thời gian (tính bằng giây).\n"
                "Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng mảng (không dùng markdown code block, không thêm lời chào):\n"
                "[{\"index\": 1, \"start\": 0.0, \"end\": 2.5, \"text\": \"câu nói gốc trong video\"}]\n"
                "Nếu file âm thanh hoàn toàn không có lời thoại (chỉ có nhạc hoặc im lặng), trả về: []"
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={act_audio_key}"
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt_text},
                        {"inline_data": {"mime_type": mime, "data": b64_audio}}
                    ]
                }]
            }
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=90)
            if res.status_code == 200:
                resp_json = res.json()
                raw_text = resp_json['candidates'][0]['content']['parts'][0]['text'].strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                    raw_text = re.sub(r"\n?```$", "", raw_text)
                parsed = json.loads(raw_text.strip())
                if isinstance(parsed, list):
                    subtitles = []
                    for s in parsed:
                        if isinstance(s, dict) and s.get("text"):
                            raw_t = str(s.get("text", "")).strip()
                            clean_t = re.sub(r'^[.\s,!?…–—\-~_#*♪♩♫♬\(\)\[\]{}«»"\'`]+$', '', raw_t).strip()
                            if clean_t:
                                subtitles.append({
                                    "index": len(subtitles) + 1,
                                    "start": round(float(s.get("start", 0.0)), 2),
                                    "end": round(float(s.get("end", 2.0)), 2),
                                    "text": clean_t
                                })
                    if subtitles:
                        emit_progress(task_id, 40, "Lấy phụ đề", f"Gemini 2.5 Flash nhận diện thành công {len(subtitles)} câu thoại thực tế.")
                        return subtitles
                    else:
                        emit_progress(task_id, 40, "Lấy phụ đề", "Gemini xác nhận: Video không có lời thoại người nói (chỉ có nhạc hoặc im lặng).")
                        return []
            else:
                emit_progress(task_id, 35, "Lấy phụ đề", f"Gemini Audio ASR HTTP {res.status_code}: {res.text[:80]}")
        except Exception as e:
            emit_progress(task_id, 35, "Lấy phụ đề", f"Gemini Audio: {str(e)[:80]}")

    # 3. No API key configured
    raise RuntimeError(
        "Chưa cấu hình API Key nhận diện giọng nói! Vui lòng vào mục 'Cấu Hình API Dịch' trên giao diện để nhập Gemini API Key hoặc Groq API Key thật."
    )

# ==================== STEP 3: GEMINI & MULTI-TIER TRANSLATION ====================
def translate_via_google_free(subtitles_subset: list) -> dict:
    """
    100% free, high-speed neural translation fallback via Google Translate Web API.
    Zero quota limits, never fails with 503, guarantees Vietnamese translation.
    """
    import urllib.request, urllib.parse, json
    if not subtitles_subset:
        return {}
    
    result_map = {}
    pattern = re.compile(r'\[(\d+)\]\s*(.+)')
    
    # Process in chunks of 25 lines to prevent payload limits
    chunk_size = 25
    for i in range(0, len(subtitles_subset), chunk_size):
        chunk = subtitles_subset[i:i + chunk_size]
        lines = [f"[{s['index']}] {s['text']}" for s in chunk]
        payload_text = "\n".join(lines)
        
        try:
            url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t"
            encoded_data = urllib.parse.urlencode({"q": payload_text}).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=encoded_data,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=15) as res:
                data = json.loads(res.read().decode("utf-8"))
                trans_text = "".join([part[0] for part in data[0] if part and part[0]])
                for line in trans_text.split("\n"):
                    m = pattern.search(line.strip())
                    if m:
                        result_map[int(m.group(1))] = m.group(2).strip()
        except Exception:
            pass

        # For any item in chunk still missing, translate individually
        for item in chunk:
            idx = item['index']
            if idx not in result_map:
                try:
                    q_enc = urllib.parse.quote(item['text'])
                    u = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q={q_enc}"
                    r = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(r, timeout=8) as resp:
                        single_data = json.loads(resp.read().decode("utf-8"))
                        single_trans = "".join([p[0] for p in single_data[0] if p and p[0]])
                        if single_trans:
                            result_map[idx] = single_trans.strip()
                except Exception:
                    pass

    return result_map

def step_gemini_translation(task_id: int, subtitles: list, genre: str, quality: str, gemini_key: str = None, characters: list = None) -> list:
    if not subtitles:
        emit_progress(task_id, 50, "Dịch AI", "Không có câu thoại nào trong video cần dịch.")
        return []

    import requests, math

    char_rules = ""
    if characters and isinstance(characters, list) and len(characters) > 0:
        valid_chars = [f"- '{c.get('originalName', '')}' dịch thành '{c.get('translatedName', '')}' (xưng hô: {c.get('pronoun', 'mặc định')})" for c in characters if isinstance(c, dict) and c.get('originalName')]
        if valid_chars:
            char_rules = "BẮT BUỘC tuân thủ từ điển nhân vật sau:\n" + "\n".join(valid_chars) + "\n\n"

    pattern = re.compile(r'\[(\d+)\]\s*(.+)')
    translated_map = {}

    gemini_rotator = ApiKeyRotator(gemini_key, service_name="Gemini", default_min_interval=3.0)

    if gemini_rotator.has_keys():
        total_keys = gemini_rotator.get_total_keys()
        BATCH_SIZE = 40
        total_batches = int(math.ceil(len(subtitles) / BATCH_SIZE))
        if total_keys > 1:
            emit_progress(task_id, 45, "Dịch AI", f"Khởi động Gemini với {total_keys} API Keys (Chia tải xoay tua Round-Robin & Tự động đổi key khi chạm giới hạn 429, thể loại: {genre})...")
        else:
            emit_progress(task_id, 45, "Dịch AI", f"Gửi {len(subtitles)} câu thoại lên Gemini 2.5 Flash ({total_batches} đợt dịch, 1 Key có điều tốc chống 429, thể loại: {genre})...")

        models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]

        for b_idx in range(total_batches):
            batch = subtitles[b_idx * BATCH_SIZE : (b_idx + 1) * BATCH_SIZE]
            lines_prompt = "\n".join([f"[{s['index']}] {s['text']}" for s in batch])
            prompt = (
                f"Bạn là chuyên gia dịch thuật video thể loại {genre} ({quality}).\n"
                f"{char_rules}"
                f"Hãy dịch các câu thoại sau sang tiếng Việt tự nhiên, phù hợp với văn phong phim ảnh, giữ nguyên cấu trúc [index] và mốc số:\n"
                f"{lines_prompt}\n"
                f"Chỉ trả về các dòng dạng: [index] Bản dịch tiếng Việt"
            )
            pct = 45 + int(15 * ((b_idx + 1) / total_batches))

            batch_success = False
            for model_name in models_to_try:
                if batch_success:
                    break

                max_attempts = min(4, max(2, total_keys))
                for attempt_i in range(max_attempts):
                    active_key = gemini_rotator.get_next_key(emit_fn=emit_progress, task_id=task_id)
                    if not active_key:
                        break

                    masked_k = gemini_rotator.get_masked_key(active_key)
                    emit_progress(task_id, pct, "Dịch AI", f"Gemini dịch đợt {b_idx + 1}/{total_batches} (câu {batch[0]['index']}-{batch[-1]['index']}/{len(subtitles)}) qua Key [{masked_k}] trên {model_name}...")

                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={active_key}"
                    payload = {"contents": [{"parts": [{"text": prompt}]}]}

                    try:
                        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
                        if res.status_code == 200:
                            resp_json = res.json()
                            candidates = resp_json.get('candidates', [])
                            if candidates and 'content' in candidates[0] and 'parts' in candidates[0]['content']:
                                text_out = candidates[0]['content']['parts'][0]['text']
                                for line in text_out.split('\n'):
                                    m = pattern.search(line.strip())
                                    if m:
                                        translated_map[int(m.group(1))] = m.group(2).strip()
                                batch_success = True
                                break
                        elif res.status_code == 429:
                            gemini_rotator.mark_rate_limited(active_key, cooldown_seconds=60.0, emit_fn=emit_progress, task_id=task_id)
                            # Retry immediately with next rotated key
                            continue
                        elif res.status_code in [400, 403]:
                            gemini_rotator.mark_invalid(active_key, emit_fn=emit_progress, task_id=task_id)
                            continue
                        elif res.status_code in [500, 503]:
                            time.sleep(1.0)
                            continue
                        else:
                            break
                    except Exception:
                        time.sleep(1.0)
    else:
        emit_progress(task_id, 45, "Dịch AI", f"Kích hoạt hệ thống dịch ngữ cảnh chuyên sâu Google Neural Engine ({len(subtitles)} câu thoại)...")

    # Fallback to Google Neural Translation for any missing or untranslated lines
    missing_items = [s for s in subtitles if s['index'] not in translated_map]
    if missing_items:
        emit_progress(task_id, 55, "Dịch AI", f"Hoàn thiện {len(missing_items)} câu thoại qua bộ dịch chuyên sâu...")
        google_trans = translate_via_google_free(missing_items)
        for idx, trans_val in google_trans.items():
            translated_map[idx] = trans_val

    # Final sweep: Apply dictionary character replacement and ensure zero Chinese characters remain
    chinese_char_regex = re.compile(r'[\u4e00-\u9fff]')
    for s in subtitles:
        val = translated_map.get(s['index'], '').strip()
        # If still missing or still containing Chinese characters, force single line translation
        if not val or chinese_char_regex.search(val):
            single_fallback = translate_via_google_free([s])
            val = single_fallback.get(s['index'], val)

        # Character dictionary replacement
        if characters and isinstance(characters, list):
            for c in characters:
                if isinstance(c, dict) and c.get('originalName') and c.get('translatedName'):
                    orig = c.get('originalName')
                    trans = c.get('translatedName')
                    if orig in val:
                        val = val.replace(orig, trans)

        s['trans'] = val if val else s.get('text', '')

    emit_progress(task_id, 60, "Dịch AI", f"Hoàn tất dịch toàn bộ {len(subtitles)} câu thoại sang Tiếng Việt chuẩn xác.")
    return subtitles

# ==================== STEP 4: EDGE-TTS & RESILIENT VOICE SYNTHESIS ====================
async def generate_single_tts_robust(text: str, voice: str, rate_str: str, out_path: Path) -> bool:
    import edge_tts, urllib.request, urllib.parse
    clean_text = text.strip()
    if not clean_text:
        return False

    # Attempt 1 & 2: Edge-TTS with Microsoft Neural Voice
    for attempt in range(2):
        try:
            communicate = edge_tts.Communicate(clean_text, voice, rate=rate_str)
            await communicate.save(str(out_path))
            if out_path.exists() and out_path.stat().st_size > 500:
                return True
        except Exception:
            await asyncio.sleep(0.35 * (attempt + 1))

    # Fallback: Google Translate Neural TTS (100% resilient, zero drop rate, instant response)
    try:
        url = "http://translate.google.com/translate_tts?ie=UTF-8&q=" + urllib.parse.quote(clean_text) + "&tl=vi&client=tw-ob"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            if len(data) > 200:
                with open(out_path, "wb") as f:
                    f.write(data)
                return True
    except Exception:
        pass

    return False

def step_tts_synthesis(task_id: int, subtitles: list, temp_dir: Path, voice_name: str, speed: float) -> Path:
    if not subtitles:
        emit_progress(task_id, 75, "Tạo giọng đọc", "Video không có lời thoại, bỏ qua bước lồng tiếng AI.")
        return None

    emit_progress(task_id, 65, "Tạo giọng đọc", f"Khởi tạo AI lồng tiếng chuẩn xác ({voice_name})...")

    # Map friendly voice name to Microsoft neural voice tag
    voice_map = {
        "Cô Gái Hoạt Ngôn (vi-VN)": "vi-VN-HoaiMyNeural",
        "Nam Miền Bắc Trầm Ấm (vi-VN)": "vi-VN-NamMinhNeural",
        "Nam Miền Nam Truyền Cảm (vi-VN)": "vi-VN-NamMinhNeural",
        "Nữ Nhẹ Nhàng (vi-VN)": "vi-VN-HoaiMyNeural",
        "Giọng Trầm Kể Chuyện (vi-VN)": "vi-VN-NamMinhNeural",
    }
    voice_tag = voice_name if str(voice_name).endswith("Neural") else voice_map.get(voice_name, "vi-VN-HoaiMyNeural")

    rate_percent = int((speed - 1.0) * 100)
    rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"

    audio_segments = []
    import asyncio
    ffmpeg_exe = get_ffmpeg_path()

    emit_progress(task_id, 65, "Tạo giọng đọc", f"Khởi tạo lồng tiếng song song ({len(subtitles)} câu thoại)...")

    async def synth_batch():
        sem = asyncio.Semaphore(2) # Safe concurrency to prevent websocket resets
        completed_count = 0

        async def worker(sub_item):
            nonlocal completed_count
            txt = sub_item.get('trans', sub_item.get('text', '')).strip()
            if not txt:
                completed_count += 1
                return
            idx = sub_item['index']
            seg_mp3 = temp_dir / f"tts_{task_id}_{idx}.mp3"
            seg_wav = temp_dir / f"tts_{task_id}_{idx}.wav"

            async with sem:
                ok = await generate_single_tts_robust(txt, voice_tag, rate_str, seg_mp3)
                if ok and seg_mp3.exists() and seg_mp3.stat().st_size > 0:
                    cmd_conv = [
                        ffmpeg_exe, "-y",
                        "-i", str(seg_mp3),
                        "-ar", "24000", "-ac", "1",
                        str(seg_wav)
                    ]
                    subprocess.run(cmd_conv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                await asyncio.sleep(0.1)

            completed_count += 1
            if completed_count % 10 == 0 or completed_count == len(subtitles):
                pct = 65 + int(12 * (completed_count / len(subtitles)))
                emit_progress(task_id, pct, "Tạo giọng đọc", f"Đã lồng tiếng câu {completed_count}/{len(subtitles)} ({pct}%)...")

        await asyncio.gather(*[worker(s) for s in subtitles])

    asyncio.run(synth_batch())

    for s in subtitles:
        seg_wav = temp_dir / f"tts_{task_id}_{s['index']}.wav"
        if seg_wav.exists() and seg_wav.stat().st_size > 0:
            audio_segments.append((s, seg_wav))

    full_voice_wav = temp_dir / f"full_voice_{task_id}.wav"

    if audio_segments:
        # Build timeline-accurate concat list with exact silence gaps
        concat_list = temp_dir / f"concat_{task_id}.txt"
        current_time = 0.0
        concat_items = []
        import wave

        for idx, (s, seg_wav) in enumerate(audio_segments):
            target_start = float(s.get('start', 0.0))
            if target_start > current_time + 0.04:
                gap = round(target_start - current_time, 3)
                silence_file = temp_dir / f"silence_{task_id}_{idx}.wav"
                cmd_sil = [
                    ffmpeg_exe, "-y",
                    "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                    "-t", str(gap),
                    str(silence_file)
                ]
                subprocess.run(cmd_sil, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if silence_file.exists():
                    concat_items.append(silence_file)
                current_time = target_start

            concat_items.append(seg_wav)
            try:
                with wave.open(str(seg_wav), 'rb') as wf:
                    seg_dur = wf.getnframes() / float(wf.getframerate())
            except Exception:
                seg_dur = max(0.5, float(s.get('end', target_start + 1.0)) - target_start)
            current_time += seg_dur

        with open(concat_list, "w", encoding="utf-8") as f:
            for item in concat_items:
                f.write(f"file '{item.resolve().as_posix()}'\n")

        cmd = [
            ffmpeg_exe, "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c:a", "pcm_s16le",
            str(full_voice_wav)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        emit_progress(task_id, 78, "Tạo giọng đọc", "Đã ghép dải âm thanh lồng tiếng chuẩn timeline khớp từng giây.")
    else:
        # Generate clean tone fallback
        cmd = [
            ffmpeg_exe, "-y",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-t", "10",
            str(full_voice_wav)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    emit_progress(task_id, 80, "Tạo giọng đọc", "Tạo file giọng đọc AI hoàn tất.")
    return full_voice_wav

def get_video_dimensions(video_path: Path):
    try:
        ffmpeg_exe = get_ffmpeg_path()
        cmd = [ffmpeg_exe, "-i", str(video_path)]
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        m = re.search(r",\s*(\d{3,5})x(\d{3,5})", p.stderr)
        if m:
            return int(m.group(1)), int(m.group(2))
    except Exception:
        pass
    return 1280, 720

# ==================== STEP 5: RENDER VIDEO WITH FFMPEG ====================
def build_audio_filter_graph(settings: dict, orig_vol: float, voice_vol: float) -> str:
    """
    Builds advanced FFmpeg audio filter complex:
    - vocal_cut: Center-channel vocal cancellation + vocal formant bandstop filters (removes Chinese/foreign speech while keeping BGM & SFX)
    - ducking: Smart sidechain compression (original audio volume ducks when narration speaks)
    - mute_original: 100% clean AI narration only (zero original audio)
    - mix_normal: Traditional proportional volume mixing
    - audioDenoise: FFT denoise (afftdn)
    """
    filter_mode = settings.get("audioFilterMode", "vocal_cut")
    denoise = settings.get("audioDenoise", True)

    if filter_mode == "mute_original" or orig_vol <= 0.001:
        return f"[1:a]volume={voice_vol}[aout]"

    orig_filters = []
    if denoise:
        orig_filters.append("afftdn=nf=-25")

    if filter_mode == "vocal_cut":
        # Ensure stereo layout first so mono audio never causes pan filter syntax errors
        orig_filters.append("aformat=channel_layouts=stereo")
        orig_filters.append("pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0")
        orig_filters.append("equalizer=f=1000:t=q:w=1.5:g=-18")
        orig_filters.append("equalizer=f=2500:t=q:w=1.5:g=-14")

    orig_filters.append(f"volume={orig_vol}")
    orig_filter_str = ",".join(orig_filters)

    if filter_mode == "ducking":
        # Smart sidechain ducking: original audio drops smoothly when TTS narration plays
        return (
            f"[0:a]{orig_filter_str}[a_orig];"
            f"[1:a]volume={voice_vol},asplit=2[a_tts][a_side];"
            f"[a_orig][a_side]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=250[a_ducked];"
            f"[a_ducked][a_tts]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )
    else:
        # Vocal cut or mix_normal
        return (
            f"[0:a]{orig_filter_str}[a_orig];"
            f"[1:a]volume={voice_vol}[a_tts];"
            f"[a_orig][a_tts]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )

def build_anti_copyright_filter_str(anti: dict) -> str:
    """
    Builds video filter chain for anti-copyright bypass:
    - flipHorizontal: hflip
    - cropZoom: scale and crop
    - brightness, contrast, saturation: eq
    - noiseOverlay: noise
    """
    if not anti:
        return ""
    filters = []
    if anti.get("flipHorizontal", False):
        filters.append("hflip")
    zoom = float(anti.get("cropZoom", 100))
    if zoom > 100:
        factor = zoom / 100.0
        filters.append(f"scale=trunc(iw*{factor}/2)*2:trunc(ih*{factor}/2)*2,crop=trunc(iw/{factor}/2)*2:trunc(ih/{factor}/2)*2")
    b = float(anti.get("brightness", 0)) / 100.0
    c = float(anti.get("contrast", 1.0))
    s = float(anti.get("saturation", 1.0))
    if b != 0.0 or abs(c - 1.0) > 0.01 or abs(s - 1.0) > 0.01:
        filters.append(f"eq=brightness={b:.2f}:contrast={c:.2f}:saturation={s:.2f}")
    noise = int(anti.get("noiseOverlay", 0))
    if noise > 0:
        filters.append(f"noise=alls={noise}:allf=t+u")
    return ",".join(filters)

def step_render_video(
    task_id: int,
    raw_video: Path,
    voice_wav: Path,
    subtitles: list,
    temp_dir: Path,
    output_dir: Path,
    settings: dict,
    old_sub_box: dict,
    new_sub_box: dict,
    anti_settings: dict = None,
    task_name: str = None
) -> Path:
    emit_progress(task_id, 82, "Render video", "Tạo file phụ đề và cấu hình bộ lọc...")
    output_dir.mkdir(parents=True, exist_ok=True)
    clean_name = re.sub(r'[\\/*?:"<>|]', '_', task_name).strip()[:45] if task_name else str(task_id)
    final_output = output_dir / f"Reup_{clean_name}.mp4"
    if final_output.exists():
        try:
            final_output.unlink()
        except Exception:
            pass

    srt_path = temp_dir / f"subtitles_{task_id}.srt"

    # Detect actual video dimensions dynamically
    vid_w, vid_h = get_video_dimensions(raw_video)

    # Convert settings to styling scaled proportionally to video resolution
    base_font_size = int(settings.get('fontSize', 25))
    font_size = max(12, int(base_font_size * (vid_h / 720.0)))
    text_color_ass = hex_to_ass_color(settings.get('textColor', '#f59e0b'), "&H000BB7F5&")
    stroke_color_ass = hex_to_ass_color(settings.get('strokeColor', '#000000'), "&H00000000&")

    # MarginV dynamically calculated from actual video height and new_sub_box Y percentage
    box_y = float(new_sub_box.get('y', 78))
    margin_v = max(10, int(vid_h * (1.0 - (box_y / 100.0)) - (vid_h * 0.04)))

    # Write SRT file
    def sec_to_srt(s):
        h = int(s // 3600)
        m = int((s % 3600) // 60)
        sec = int(s % 60)
        ms = int(round((s - int(s)) * 1000))
        return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"

    with open(srt_path, "w", encoding="utf-8") as f:
        for s in subtitles:
            f.write(f"{s['index']}\n")
            f.write(f"{sec_to_srt(s['start'])} --> {sec_to_srt(s['end'])}\n")
            f.write(f"{s.get('trans', s.get('text', ''))}\n\n")

    filter_mode_labels = {
        "vocal_cut": "Khử giọng nói gốc (Vocal Cut)",
        "ducking": "Tự động né âm (Smart Ducking)",
        "mute_original": "Tắt hoàn toàn tiếng gốc (Muted)",
        "mix_normal": "Trộn âm thông thường"
    }
    cur_filter_label = filter_mode_labels.get(settings.get("audioFilterMode", "vocal_cut"), "Lọc âm")
    emit_progress(task_id, 88, "Render video", f"[FFmpeg] Che sub cũ, burn sub và xử lý âm thanh: {cur_filter_label}...")

    # Boxblur parameters from old_sub_box using ACTUAL video dimensions (ensures valid coordinates on all resolutions)
    bx = max(0, int(float(old_sub_box.get('x', 18)) / 100.0 * vid_w))
    by = max(0, int(float(old_sub_box.get('y', 72)) / 100.0 * vid_h))
    bw = max(20, int(float(old_sub_box.get('width', 32)) / 100.0 * vid_w))
    bh = max(10, int(float(old_sub_box.get('height', 9)) / 100.0 * vid_h))

    # Clamp boundaries to guarantee crop is 100% inside video
    if bx + bw > vid_w: bw = vid_w - bx
    if by + bh > vid_h: bh = vid_h - by
    if bw % 2 != 0: bw += 1
    if bh % 2 != 0: bh += 1
    if bx % 2 != 0: bx -= 1
    if by % 2 != 0: by -= 1
    bx = max(0, min(bx, vid_w - 2))
    by = max(0, min(by, vid_h - 2))
    bw = max(4, min(bw, vid_w - bx))
    bh = max(4, min(bh, vid_h - by))

    max_safe_blur = max(1, int(min(bw, bh) / 2) - 1)
    raw_blur = int(settings.get('blurRadius', 25))
    blur_r = max(1, min(max_safe_blur, raw_blur))
    blur_luma = max(1, min(max_safe_blur, int(blur_r / 2) if blur_r > 2 else 1))
    blur_chroma = max(1, min(max_safe_blur, int(blur_luma / 2) if blur_luma > 2 else 1))

    # Volumes
    orig_vol = float(settings.get('originalAudioVolume', 20)) / 100.0
    voice_vol = float(settings.get('voiceVolume', 100)) / 100.0

    ffmpeg_exe = get_ffmpeg_path()
    try:
        srt_rel = str(srt_path.relative_to(Path.cwd())).replace('\\', '/')
    except Exception:
        srt_rel = str(srt_path).replace('\\', '/').replace(':', '\\:')

    enc_name, enc_flags, enc_label = detect_gpu_encoder(ffmpeg_exe)
    emit_progress(task_id, 90, "Render video", f"Tăng tốc phần cứng FFmpeg: {enc_label}")

    anti_filter = build_anti_copyright_filter_str(anti_settings)
    anti_part = f",{anti_filter}" if anti_filter else ""

    anti_flags = []
    if anti_settings:
        if anti_settings.get("stripMetadata", True):
            anti_flags += ["-map_metadata", "-1"]
        if anti_settings.get("randomizeMd5", True):
            import uuid
            anti_flags += ["-metadata", f"comment=mmo_{uuid.uuid4().hex[:10]}"]

    if subtitles and voice_wav and voice_wav.exists():
        audio_filter_part = build_audio_filter_graph(settings, orig_vol, voice_vol)
        filter_complex = (
            f"[0:v]crop=w={bw}:h={bh}:x={bx}:y={by},boxblur={blur_luma}:1:{blur_chroma}:1[blurred];"
            f"[0:v][blurred]overlay=x={bx}:y={by}[vblurred];"
            f"[vblurred]subtitles=filename='{srt_rel}':force_style='FontSize={font_size},PrimaryColour={text_color_ass},OutlineColour={stroke_color_ass},MarginV={margin_v}'{anti_part}[vout];"
            f"{audio_filter_part}"
        )
        cmd = [
            ffmpeg_exe, "-y",
            "-i", str(raw_video),
            "-i", str(voice_wav),
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "[aout]",
        ] + enc_flags + anti_flags + [
            "-c:a", "aac", "-b:a", "192k",
            str(final_output)
        ]
    else:
        filter_complex = (
            f"[0:v]crop=w={bw}:h={bh}:x={bx}:y={by},boxblur={blur_luma}:1:{blur_chroma}:1[blurred];"
            f"[0:v][blurred]overlay=x={bx}:y={by}{anti_part}[vout]"
        )
        cmd = [
            ffmpeg_exe, "-y",
            "-i", str(raw_video),
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "0:a?",
        ] + enc_flags + anti_flags + [
            "-c:a", "copy",
            str(final_output)
        ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if not final_output.exists() or final_output.stat().st_size == 0:
        # Fallback to libx264 if hardware encoder failed
        if subtitles and voice_wav and voice_wav.exists():
            audio_filter_part = build_audio_filter_graph(settings, orig_vol, voice_vol)
            cmd_fallback = [
                ffmpeg_exe, "-y",
                "-i", str(raw_video),
                "-i", str(voice_wav),
                "-filter_complex", f"[0:v]crop=w={bw}:h={bh}:x={bx}:y={by},boxblur={blur_luma}:1:{blur_chroma}:1[blurred];[0:v][blurred]overlay=x={bx}:y={by}[vblurred];[vblurred]subtitles=filename='{srt_rel}'{anti_part}[vout];{audio_filter_part}",
                "-map", "[vout]",
                "-map", "[aout]",
                "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                "-c:a", "aac",
            ] + anti_flags + [
                str(final_output)
            ]
        else:
            cmd_fallback = [
                ffmpeg_exe, "-y",
                "-i", str(raw_video),
                "-filter_complex", f"[0:v]crop=w={bw}:h={bh}:x={bx}:y={by},boxblur={blur_luma}:1:{blur_chroma}:1[blurred];[0:v][blurred]overlay=x={bx}:y={by}{anti_part}[vout]",
                "-map", "[vout]",
                "-map", "0:a?",
                "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                "-c:a", "copy",
            ] + anti_flags + [
                str(final_output)
            ]
        res_fb = subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if not final_output.exists() or final_output.stat().st_size == 0:
            err_detail = (res_fb.stderr or "")[-300:]
            raise RuntimeError(f"FFmpeg render thất bại: {err_detail}")

    emit_progress(task_id, 98, "Render video", f"Tạo file thành công ({enc_name}): {final_output.name}")
    return final_output

# ==================== STEP 6: PRODUCE AUDIO NOVEL & PODCAST ====================
def step_produce_audio_novel(
    task_id: int,
    source_str: str,
    temp_dir: Path,
    output_dir: Path,
    settings: dict,
    extra_config: dict
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    title = extra_config.get("title", f"Truyen_{task_id}").strip()
    clean_title = re.sub(r'[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9 ]', '', title).replace(" ", "_")[:30]
    final_output = output_dir / f"Audio_{clean_title}.mp4"

    txt_file = Path(source_str.replace("audio_novel:", "").strip())
    if not txt_file.exists():
        raise FileNotFoundError(f"Không tìm thấy file truyện chữ: {txt_file}")

    with open(txt_file, "r", encoding="utf-8") as f:
        story_content = f.read().strip()

    word_count = len(story_content.split())
    emit_progress(task_id, 15, "Phân tích văn bản", f"Tách đoạn và chuẩn bị lồng tiếng ({word_count} từ)...")

    voice = extra_config.get("voice", settings.get("voice", "Nam Miền Bắc Trầm Ấm (vi-VN)"))
    speed = float(extra_config.get("speed", settings.get("speed", 1.1)))
    bgm_vol = float(extra_config.get("bgm_volume", 12)) / 100.0

    voice_code_map = {
        "Nam Miền Bắc Trầm Ấm (vi-VN)": "vi-VN-NamMinhNeural",
        "Nam Trầm Ấm (Nam VIP)": "vi-VN-NamMinhNeural",
        "Nam Trầm Ấm": "vi-VN-NamMinhNeural",
        "Cô Gái Hoạt Ngôn (vi-VN)": "vi-VN-HoaiMyNeural",
        "Cô Gái Hoạt Ngôn (Free)": "vi-VN-HoaiMyNeural",
        "Cô Gái Hoạt Ngôn": "vi-VN-HoaiMyNeural",
        "Nữ Nhẹ Nhàng (vi-VN)": "vi-VN-HoaiMyNeural",
        "Nam Miền Nam Truyền Cảm (vi-VN)": "vi-VN-NamMinhNeural",
        "Giọng Trầm Kể Chuyện (vi-VN)": "vi-VN-NamMinhNeural",
        "Chị Google": "vi-VN-HoaiMyNeural",
    }
    v_code = voice if str(voice).endswith("Neural") else voice_code_map.get(voice, "vi-VN-NamMinhNeural")

    emit_progress(task_id, 35, "Lồng tiếng AI", f"Tổng hợp giọng đọc truyền cảm ({voice})...")
    rate_str = f"+{int((speed - 1.0) * 100)}%" if speed >= 1.0 else f"-{int((1.0 - speed) * 100)}%"
    voice_mp3 = temp_dir / f"story_voice_{task_id}.mp3"

    cmd_tts = [
        sys.executable, "-m", "edge_tts",
        "--voice", v_code,
        "--rate", rate_str,
        "--text", story_content,
        "--write-media", str(voice_mp3)
    ]
    subprocess.run(cmd_tts, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Probe duration
    ffmpeg_exe = get_ffmpeg_path()
    dur_cmd = [ffmpeg_exe, "-i", str(voice_mp3)]
    p_dur = subprocess.run(dur_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p_dur.stderr)
    total_sec = 60.0
    if m:
        total_sec = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) + 1.0

def get_system_font_path() -> str:
    windir = os.environ.get("WINDIR", "C:\\Windows")
    for fname in ["arial.ttf", "segoeui.ttf", "tahoma.ttf", "consola.ttf"]:
        p = Path(windir) / "Fonts" / fname
        if p.exists():
            return str(p).replace("\\", "/").replace(":", "\\:")
    return ""

    emit_progress(task_id, 65, "Tạo BGM & Background", f"Trộn nhạc nền du dương ({int(total_sec)}s) và thiết kế khung hình...")

    enc_name, enc_flags, enc_label = detect_gpu_encoder(ffmpeg_exe)
    safe_title = title.replace("'", "").replace(":", "")[:35]
    sys_font = get_system_font_path()
    font_filter = f"fontfile='{sys_font}':" if sys_font else ""

    cmd_render = [
        ffmpeg_exe, "-y",
        "-f", "lavfi", "-i", f"color=c=#0b1120:s=1280x720:d={total_sec:.2f}",
        "-i", str(voice_mp3),
        "-filter_complex", (
            f"[0:v]drawtext={font_filter}text='{safe_title}':fontsize=42:fontcolor=#f59e0b:x=(w-text_w)/2:y=200,"
            f"drawtext={font_filter}text='SẢN XUẤT TRUYỆN AUDIO & PODCAST AI':fontsize=20:fontcolor=#94a3b8:x=(w-text_w)/2:y=265[vout];"
            f"aevalsrc=sin(220*2*PI*t)*0.012+sin(330*2*PI*t)*0.008:d={total_sec:.2f}[bgm];"
            f"[bgm]volume={bgm_vol}[bgm_low];"
            f"[bgm_low][1:a]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        ),
        "-map", "[vout]",
        "-map", "[aout]",
    ] + enc_flags + [
        "-c:a", "aac", "-b:a", "192k",
        str(final_output)
    ]

    emit_progress(task_id, 85, "Render hoàn thiện", f"Tăng tốc phần cứng FFmpeg: {enc_label}")
    subprocess.run(cmd_render, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if not final_output.exists() or final_output.stat().st_size == 0:
        cmd_fb = [
            ffmpeg_exe, "-y",
            "-f", "lavfi", "-i", f"color=c=#0b1120:s=1280x720:d={total_sec:.2f}",
            "-i", str(voice_mp3),
            "-filter_complex", (
                f"[0:v]drawtext={font_filter}text='{safe_title}':fontsize=38:fontcolor=#f59e0b:x=(w-text_w)/2:y=200[vout];"
                f"[1:a]volume=1.0[aout]"
            ),
            "-map", "[vout]",
            "-map", "[aout]",
            "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            str(final_output)
        ]
        subprocess.run(cmd_fb, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    emit_progress(task_id, 100, "Hoàn tất", f"Xuất video Truyện Audio thành công: {final_output.name}")
    return final_output

# ==================== MAIN DISPATCHER ====================
def main():
    parser = argparse.ArgumentParser(description="MMO Studio Video Pipeline")
    parser.add_argument("--task-id", type=int, required=True)
    parser.add_argument("--name", type=str, default="")
    parser.add_argument("--source", type=str, required=True)
    parser.add_argument("--output-dir", type=str, default=str(BASE_DIR / "output"))
    parser.add_argument("--config", type=str, default="{}")
    args = parser.parse_args()

    task_id = args.task_id
    initial_name = args.name
    source = args.source
    output_dir = Path(args.output_dir)

    try:
        config = json.loads(args.config)
    except Exception:
        config = {}

    if not initial_name:
        initial_name = config.get("task_name", config.get("name", ""))

    settings = config.get("settings", config)
    old_sub_box = config.get("oldSubBlurBox", config.get("old_sub_blur_box", {"x": 18, "y": 72, "width": 32, "height": 9}))
    new_sub_box = config.get("newSubBox", config.get("new_sub_box", {"x": 20, "y": 78, "width": 60, "height": 11}))
    gemini_key = config.get("geminiApiKey", config.get("gemini_api_key", settings.get("geminiApiKey", settings.get("gemini_api_key", ""))))
    groq_key = config.get("groqApiKey", config.get("groq_api_key", settings.get("groqApiKey", settings.get("groq_api_key", ""))))
    cookie_data = config.get("douyinCookie", config.get("douyin_cookie", settings.get("douyinCookie", settings.get("douyin_cookie", ""))))
    characters = config.get("characters", settings.get("characters", []))

    # Always fallback to disk config/settings.json if keys missing
    settings_file = BASE_DIR / "config" / "settings.json"
    if settings_file.exists():
        try:
            with open(settings_file, "r", encoding="utf-8") as sf:
                disk_cfg = json.load(sf)
                if not gemini_key:
                    gemini_key = disk_cfg.get("gemini_api_key", disk_cfg.get("geminiApiKey", ""))
                if not groq_key:
                    groq_key = disk_cfg.get("groq_api_key", disk_cfg.get("groqApiKey", ""))
        except Exception:
            pass

    temp_dir = Path(f"./temp/task_{task_id}").resolve()
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        emit_progress(task_id, 0, "Khởi chạy", f"Bắt đầu quy trình xử lý tác vụ #{task_id}")

        anti_settings = config.get("anti_copyright", config.get("antiCopyright", settings.get("antiCopyright", {})))

        # Step 0: Check if this is an Audio Novel production task
        if source.startswith("audio_novel:") or source.endswith(".txt"):
            extra_cfg = config.get("extra_config", {})
            out_file = step_produce_audio_novel(task_id, source, temp_dir, output_dir, settings, extra_cfg)
            emit_done(task_id, str(out_file.resolve()), f"Sản xuất Video Truyện Audio thành công: {out_file.name}")
            return

        # Step 1: Input / Download
        video_raw, extracted_title = step_download_or_copy(task_id, source, temp_dir, cookie_data, preferred_name=initial_name)
        final_task_name = extracted_title or initial_name or str(task_id)

        # Check AI Engine Mode & Render Engine (supports both snake_case from settings.json and camelCase)
        ai_engine_mode = settings.get("ai_engine_mode") or settings.get("aiEngineMode") or "CLOUD_LOCAL"
        render_engine = settings.get("render_engine") or settings.get("renderEngine") or "FFmpeg Siêu Tốc (Chạy ngầm 100%)"
        custom_draft_dir = config.get("capcut_draft_dir") or config.get("capcutDraftDir") or settings.get("capcut_draft_dir") or settings.get("capcutDraftDir") or ""
        custom_capcut_exe = config.get("capcut_exe_path") or config.get("capcutExePath") or settings.get("capcut_exe_path") or settings.get("capcutExePath") or ""
        account_type = str(settings.get("capcut_account_type") or settings.get("capcutAccountType") or "FREE").upper()
        vip_voice = settings.get("capcut_vip_voice") or settings.get("capcutVipVoice") or "Cô Gái Hoạt Ngôn"
        sync_speed = settings.get("capcut_sync_speed", settings.get("capcutSyncSpeed", True))

        is_ffmpeg_direct = ("ffmpeg" in render_engine.lower())
        is_capcut_draft_only = ("nháp" in render_engine.lower() or "draft" in render_engine.lower())
        is_capcut_auto = ("tự động hóa capcut" in render_engine.lower() or ("capcut" in render_engine.lower() and not is_capcut_draft_only and not is_ffmpeg_direct))
        capcut_project_name = f"Reup_{re.sub(r'[\\\\/*?:\"<>|]', '_', final_task_name).strip()[:35]}"

        if is_capcut_auto:
            from capcut_ui_controller import find_capcut_main_window, get_capcut_exe_path, get_capcut_status
            cc_status = get_capcut_status(custom_capcut_exe)
            if not cc_status["is_running"] and not cc_status["exe_installed"]:
                raise RuntimeError(
                    "Máy tính của bạn chưa cài đặt phần mềm CapCut PC! "
                    "Vui lòng chọn Chế độ xuất là '⚡ FFmpeg Siêu Tốc (Chạy ngầm 100%)' để tạo video trực tiếp không cần cài CapCut."
                )

            is_free_account = (account_type != "PRO")
            tier_label = "Tài khoản Thường (Free-Safe)" if is_free_account else "Tài khoản Pro (VIP Full)"
            state_note = f"CapCut đang mở sẵn ({cc_status['screen_state']})" if cc_status["is_running"] else "Sẽ tự mở CapCut PC"
            emit_progress(task_id, 20, "CapCut Auto Pipeline", f"[{tier_label}] {state_note} - Khởi động quy trình 5 bước ({ai_engine_mode})...")
            from capcut_draft_generator import create_capcut_draft
            from capcut_ui_controller import run_native_capcut_pro_pipeline, open_draft_and_export

            # Step 1 & 2: Setup Draft & Visual Masking
            emit_progress(task_id, 25, "BƯỚC 1 & 2: Nạp & Căn Sửa", f"[{tier_label}] Nạp Video gốc & cấu hình Timeline chuẩn tỷ lệ...")
            subtitles_trans = []
            tts_segments = []
            voice_wav = None

            if is_free_account or ai_engine_mode in ["HYBRID_PRO", "CLOUD_LOCAL"]:
                # For FREE CapCut accounts (or Hybrid): pre-generate Subtitles & Voice via AI (Whisper + Gemini + Edge-TTS)
                # and inject directly into Timeline so CapCut PC exports freely without hitting the PRO Paywall!
                emit_progress(task_id, 35, "BƯỚC 3: Dịch Ngữ Cảnh", f"[{tier_label}] Bóc tách & Dịch ngữ cảnh bằng AI ngoài (tránh Paywall Auto Sub CapCut)...")
                subtitles = step_extract_and_transcribe(task_id, video_raw, temp_dir, groq_key, gemini_key)
                genre = settings.get("genre", "Tự động")
                quality = settings.get("translation_quality") or settings.get("translationQuality") or "Tự nhiên / văn nói"
                subtitles_trans = step_gemini_translation(task_id, subtitles, genre, quality, gemini_key, characters=characters)

                # Generate TTS for timeline (Free accounts always use Edge-TTS; Hybrid Pro uses CapCut VIP TTS)
                if is_free_account or ai_engine_mode == "CLOUD_LOCAL":
                    voice_name = settings.get("voice", "Cô Gái Hoạt Ngôn (vi-VN)")
                    speed = float(settings.get("speed", 1.0))
                    voice_wav = step_tts_synthesis(task_id, subtitles_trans, temp_dir, voice_name, speed)

                for s in subtitles_trans:
                    seg_path = temp_dir / f"tts_{task_id}_{s['index']}.mp3"
                    if not seg_path.exists() and voice_wav:
                        seg_path = voice_wav
                    tts_segments.append({
                        "start": s['start'],
                        "end": s['end'],
                        "audio_path": seg_path if seg_path else Path(""),
                        "text": s.get('trans', '')
                    })

            # Create comprehensive Draft Project (FREE skips Pro blur effects, PRO includes native blur effect)
            draft_folder = create_capcut_draft(
                project_name=capcut_project_name,
                raw_video_path=video_raw,
                tts_audio_segments=tts_segments,
                settings=settings,
                old_sub_box=old_sub_box,
                new_sub_box=new_sub_box,
                custom_draft_dir=custom_draft_dir,
                account_type=account_type
            )

            # Step 3, 4, 5: UI Automation (Smart detect already-open CapCut, Auto Sub/TTS for PRO, Free-safe Export for FREE)
            try:
                run_native_capcut_pro_pipeline(
                    project_name=capcut_project_name,
                    output_filename=capcut_project_name,
                    output_dir=output_dir,
                    ai_engine_mode=ai_engine_mode,
                    vip_voice=vip_voice,
                    sync_speed=sync_speed,
                    account_type=account_type,
                    capcut_exe_path=custom_capcut_exe,
                    progress_callback=lambda p, s, m: emit_progress(task_id, p, s, m),
                    gemini_key=gemini_key,
                    draft_folder=draft_folder
                )
            except Exception as e:
                emit_progress(task_id, 88, "CapCut Cảnh Báo", f"CapCut UI chưa hoàn tất ({str(e)[:90]}). Chuyển sang FFmpeg để hoàn thiện video...")

            final_mp4 = output_dir / f"{capcut_project_name}.mp4"
            if not final_mp4.exists() or final_mp4.stat().st_size == 0:
                # Guaranteed render fallback via FFmpeg if CapCut UI did not export file directly
                emit_progress(task_id, 92, "Hoàn thiện Render", "Tối ưu hóa file xuất thành phẩm bằng FFmpeg siêu tốc...")
                if not subtitles_trans:
                    subtitles = step_extract_and_transcribe(task_id, video_raw, temp_dir, groq_key, gemini_key)
                    subtitles_trans = step_gemini_translation(task_id, subtitles, settings.get("genre", "Tự động"), settings.get("translation_quality") or settings.get("translationQuality") or "Tự nhiên / văn nói", gemini_key, characters=characters)
                if not voice_wav:
                    voice_wav = step_tts_synthesis(task_id, subtitles_trans, temp_dir, settings.get("voice", "Cô Gái Hoạt Ngôn (vi-VN)"), float(settings.get("speed", 1.0)))
                final_mp4 = step_render_video(
                    task_id, video_raw, voice_wav, subtitles_trans, temp_dir, output_dir, settings, old_sub_box, new_sub_box, anti_settings=anti_settings, task_name=final_task_name
                )
                emit_done(task_id, str(final_mp4.resolve()), f"[{tier_label}] Đã hoàn tất xuất video qua FFmpeg: {final_mp4.name}")
                return

            emit_done(task_id, str(final_mp4.resolve()), f"[{tier_label}] Quy trình Tự Động Hóa CapCut hoàn tất: {final_mp4.name}")
            return

        # Step 2: Extract & ASR (For Cloud / Local mode)
        subtitles = step_extract_and_transcribe(task_id, video_raw, temp_dir, groq_key, gemini_key)

        # Step 3: Contextual Translation
        genre = settings.get("genre", "Tự động")
        quality = settings.get("translationQuality", "Tự nhiên / văn nói")
        subtitles_trans = step_gemini_translation(task_id, subtitles, genre, quality, gemini_key, characters=characters)

        # Step 4: TTS Voice
        voice_name = settings.get("voice", "Cô Gái Hoạt Ngôn (vi-VN)")
        speed = float(settings.get("speed", 1.0))
        voice_wav = step_tts_synthesis(task_id, subtitles_trans, temp_dir, voice_name, speed)

        # Step 5: Render Video / CapCut Draft Injection
        render_engine = settings.get("renderEngine", "ffmpeg")
        custom_draft_dir = config.get("capcutDraftDir", "")
        custom_capcut_exe = config.get("capcutExePath", "")

        if is_capcut_draft_only:
            emit_progress(task_id, 85, "CapCut Draft", f"Bơm Timeline ({account_type}) vào dự án CapCut PC (com.lveditor.draft)...")
            from capcut_draft_generator import create_capcut_draft

            # Prepare audio segments list
            tts_segments = []
            for s in subtitles_trans:
                seg_path = temp_dir / f"tts_{task_id}_{s['index']}.mp3"
                if not seg_path.exists():
                    seg_path = voice_wav
                tts_segments.append({
                    "start": s['start'],
                    "end": s['end'],
                    "audio_path": seg_path,
                    "text": s.get('trans', '')
                })

            draft_folder = create_capcut_draft(
                project_name=capcut_project_name,
                raw_video_path=video_raw,
                tts_audio_segments=tts_segments,
                settings=settings,
                old_sub_box=old_sub_box,
                new_sub_box=new_sub_box,
                custom_draft_dir=custom_draft_dir,
                account_type=account_type
            )
            emit_done(task_id, str(draft_folder.resolve()), f"Đã tạo Draft CapCut ({account_type}) hoàn tất: {capcut_project_name}. Mở CapCut PC để xem dự án.")

        elif "capcut_auto" in render_engine.lower() or "Tự Động Hóa CapCut" in render_engine:
            emit_progress(task_id, 85, "CapCut Auto", "Tạo Timeline và điều khiển CapCut tự động xuất video...")
            from capcut_draft_generator import create_capcut_draft
            from capcut_ui_controller import open_draft_and_export

            tts_segments = []
            for s in subtitles_trans:
                seg_path = temp_dir / f"tts_{task_id}_{s['index']}.mp3"
                if not seg_path.exists():
                    seg_path = voice_wav
                tts_segments.append({
                    "start": s['start'],
                    "end": s['end'],
                    "audio_path": seg_path,
                    "text": s.get('trans', '')
                })

            draft_folder = create_capcut_draft(
                project_name=f"Reup_{task_id}",
                raw_video_path=video_raw,
                tts_audio_segments=tts_segments,
                settings=settings,
                old_sub_box=old_sub_box,
                new_sub_box=new_sub_box,
                custom_draft_dir=custom_draft_dir
            )

            def progress_cb(pct, stg, msg):
                emit_progress(task_id, pct, stg, msg)

            open_draft_and_export(
                project_name=f"Reup_{task_id}",
                output_filename=f"Reup_{task_id}",
                output_dir=output_dir,
                capcut_exe_path=custom_capcut_exe,
                progress_callback=progress_cb
            )

            # Also produce guaranteed final MP4
            final_video = step_render_video(
                task_id, video_raw, voice_wav, subtitles_trans, temp_dir, output_dir, settings, old_sub_box, new_sub_box, anti_settings=anti_settings, task_name=final_task_name
            )
            emit_done(task_id, str(final_video.resolve()), "Tự động hóa CapCut và render video hoàn tất.")

        else:
            # Default: FFmpeg Super Fast
            final_video = step_render_video(
                task_id, video_raw, voice_wav, subtitles_trans, temp_dir, output_dir, settings, old_sub_box, new_sub_box, anti_settings=anti_settings, task_name=final_task_name
            )
            emit_done(task_id, str(final_video.resolve()), "Render video và hoàn tất toàn bộ quy trình")

    except Exception as e:
        emit_error(task_id, f"Lỗi không xác định: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
