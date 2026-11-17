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
    # 3. Common paths
    candidates = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"D:\ffmpeg\bin\ffmpeg.exe",
        os.path.expanduser(r"~\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
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
def step_download_or_copy(task_id: int, source: str, temp_dir: Path, cookie_data: str = None) -> Path:
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

    # Check if local file
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
                emit_progress(task_id, 15, "Tải video", f"Sao chép file video nội bộ: {cand.name}")
                shutil.copy2(str(cand), str(raw_video))
                emit_progress(task_id, 20, "Tải video", "Nhập video hoàn tất.")
                return raw_video
        except Exception:
            pass

    # Is URL -> run yt-dlp with android client bypass
    emit_progress(task_id, 10, "Tải video", f"[yt-dlp] Đang phân tích và tải link: {source_clean}")
    try:
        import yt_dlp
        cookie_file = None
        if cookie_data and len(cookie_data) > 10:
            cookie_file = temp_dir / "cookie_douyin.txt"
            with open(cookie_file, "w", encoding="utf-8") as cf:
                cf.write(cookie_data)

        ydl_opts = {
            'outtmpl': str(raw_video.with_suffix('')) + '.%(ext)s',
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
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

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([source_clean])

        # Find downloaded file
        matching = list(temp_dir.glob(f"input_raw_{task_id}.*"))
        if matching:
            raw_video = matching[0]
            emit_progress(task_id, 20, "Tải video", f"Tải hoàn tất: {raw_video.name}")
            return raw_video
        raise RuntimeError(f"yt-dlp không tải được video từ: {source_clean}")
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

    # Encode compressed mp3 for Gemini audio upload
    cmd_mp3 = [
        ffmpeg_exe, "-y",
        "-i", str(audio_wav),
        "-b:a", "64k",
        str(audio_mp3)
    ]
    subprocess.run(cmd_mp3, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 1. Try Groq Whisper large-v3 if groq_key provided
    if groq_key and len(groq_key.strip()) > 10 and not groq_key.startswith("gsk_mock"):
        emit_progress(task_id, 32, "Lấy phụ đề", "Đang nhận diện giọng nói (ASR Groq Whisper large-v3)...")
        try:
            import requests
            headers = {"Authorization": f"Bearer {groq_key.strip()}"}
            with open(audio_wav, "rb") as f:
                files = {"file": (audio_wav.name, f, "audio/wav")}
                data = {
                    "model": "whisper-large-v3",
                    "response_format": "verbose_json",
                    "temperature": 0.0
                }
                res = requests.post("https://api.groq.com/openai/v1/audio/transcriptions", headers=headers, files=files, data=data, timeout=90)
                if res.status_code == 200:
                    json_data = res.json()
                    segments = json_data.get("segments", [])
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
                            emit_progress(task_id, 40, "Lấy phụ đề", f"Nhận diện thành công {len(subtitles)} câu thoại thực tế từ Whisper.")
                            return subtitles
                        else:
                            emit_progress(task_id, 40, "Lấy phụ đề", "Whisper xác nhận: Video không có lời thoại người nói (chỉ có nhạc nền hoặc im lặng).")
                            return []
                else:
                    emit_progress(task_id, 35, "Lấy phụ đề", f"Groq Whisper HTTP {res.status_code}: {res.text[:80]}")
        except Exception as e:
            emit_progress(task_id, 35, "Lấy phụ đề", f"Groq Whisper thông báo: {str(e)[:80]}. Chuyển sang Gemini...")

    # 2. Try Gemini 2.5 Flash Audio Transcription if gemini_key provided
    if gemini_key and len(gemini_key.strip()) > 10 and not gemini_key.startswith("AIzaSyD-mock"):
        emit_progress(task_id, 34, "Lấy phụ đề", "Đang nhận diện giọng nói và mốc thời gian qua Gemini 2.5 Flash Audio...")
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
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key.strip()}"
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

# ==================== STEP 3: GEMINI TRANSLATION ====================
def step_gemini_translation(task_id: int, subtitles: list, genre: str, quality: str, gemini_key: str = None) -> list:
    if not subtitles:
        emit_progress(task_id, 50, "Dịch AI", "Không có câu thoại nào trong video cần dịch.")
        return []

    emit_progress(task_id, 45, "Dịch AI", f"Gửi {len(subtitles)} câu thoại lên Gemini 2.5 Flash để dịch ngữ cảnh (Thể loại: {genre})...")

    if not gemini_key or len(gemini_key.strip()) <= 10 or gemini_key.startswith("AIzaSyD-mock"):
        raise RuntimeError(
            "Chưa cấu hình Gemini API Key để dịch thuật! Vui lòng mở mục 'Cấu Hình API Dịch' trên giao diện và dán Gemini API Key thật của bạn."
        )

    try:
        import requests
        lines_prompt = "\n".join([f"[{s['index']}] {s['text']}" for s in subtitles])
        prompt = (
            f"Bạn là chuyên gia dịch thuật video thể loại {genre} ({quality}).\n"
            f"Hãy dịch các câu thoại sau sang tiếng Việt tự nhiên, giữ nguyên cấu trúc [index] và nghĩa gốc:\n"
            f"{lines_prompt}\n"
            f"Chỉ trả về các dòng dạng: [index] Bản dịch tiếng Việt"
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key.strip()}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
        if res.status_code == 200:
            resp_json = res.json()
            text_out = resp_json['candidates'][0]['content']['parts'][0]['text']
            pattern = re.compile(r'\[(\d+)\]\s*(.+)')
            translated_map = {}
            for line in text_out.split('\n'):
                m = pattern.search(line.strip())
                if m:
                    idx = int(m.group(1))
                    translated_map[idx] = m.group(2).strip()

            for s in subtitles:
                s['trans'] = translated_map.get(s['index'], s.get('text', ''))
            emit_progress(task_id, 60, "Dịch AI", f"Gemini hoàn tất dịch {len(subtitles)} câu thoại sang Tiếng Việt chuẩn xác.")
            return subtitles
        else:
            raise RuntimeError(f"Gemini API phản hồi mã lỗi HTTP {res.status_code}: {res.text[:120]}")
    except Exception as e:
        raise RuntimeError(f"Lỗi gọi Gemini 2.5 Flash API: {str(e)[:150]}")

# ==================== STEP 4: EDGE-TTS VOICE SYNTHESIS ====================
async def generate_edge_tts_async(text: str, voice: str, rate_str: str, out_path: Path):
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate_str)
    await communicate.save(str(out_path))

def step_tts_synthesis(task_id: int, subtitles: list, temp_dir: Path, voice_name: str, speed: float) -> Path:
    if not subtitles:
        emit_progress(task_id, 75, "Tạo giọng đọc", "Video không có lời thoại, bỏ qua bước lồng tiếng AI.")
        return None

    emit_progress(task_id, 65, "Tạo giọng đọc", f"Khởi tạo Edge-TTS lồng tiếng ({voice_name})...")

    # Map friendly voice name to Microsoft neural voice tag
    voice_map = {
        "Cô Gái Hoạt Ngôn (vi-VN)": "vi-VN-HoaiMyNeural",
        "Nam Miền Bắc Trầm Ấm (vi-VN)": "vi-VN-NamMinhNeural",
        "Nam Miền Nam Truyền Cảm (vi-VN)": "vi-VN-NamMinhNeural",
        "Nữ Nhẹ Nhàng (vi-VN)": "vi-VN-HoaiMyNeural",
        "Giọng Trầm Kể Chuyện (vi-VN)": "vi-VN-NamMinhNeural",
    }
    voice_tag = voice_map.get(voice_name, "vi-VN-HoaiMyNeural")

    rate_percent = int((speed - 1.0) * 100)
    rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"

    audio_segments = []
    import asyncio
    ffmpeg_exe = get_ffmpeg_path()

    for s in subtitles:
        txt = s.get('trans', s.get('text', '')).strip()
        if not txt:
            continue
        seg_mp3 = temp_dir / f"tts_{task_id}_{s['index']}.mp3"
        seg_wav = temp_dir / f"tts_{task_id}_{s['index']}.wav"
        try:
            asyncio.run(generate_edge_tts_async(txt, voice_tag, rate_str, seg_mp3))
            if seg_mp3.exists() and seg_mp3.stat().st_size > 0:
                # Convert to PCM WAV 24kHz mono for clean stitching
                cmd_conv = [
                    ffmpeg_exe, "-y",
                    "-i", str(seg_mp3),
                    "-ar", "24000", "-ac", "1",
                    str(seg_wav)
                ]
                subprocess.run(cmd_conv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if seg_wav.exists() and seg_wav.stat().st_size > 0:
                    audio_segments.append((s, seg_wav))
        except Exception:
            pass

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
        # Stereo center-channel vocal cancellation: L-R and R-L differential
        # + vocal formant band-stop filters around 1000Hz and 2500Hz
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
        filters.append(f"scale=trunc(iw*{factor}/2)*2:trunc(ih*{factor}/2)*2,crop=1280:720")
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
    anti_settings: dict = None
) -> Path:
    emit_progress(task_id, 82, "Render video", "Tạo file phụ đề và cấu hình bộ lọc...")
    output_dir.mkdir(parents=True, exist_ok=True)
    final_output = output_dir / f"Reup_{task_id}.mp4"
    if final_output.exists():
        try:
            final_output.unlink()
        except Exception:
            pass

    srt_path = temp_dir / f"subtitles_{task_id}.srt"

    # Convert settings to styling
    font_size = int(settings.get('fontSize', 25))
    text_color_ass = hex_to_ass_color(settings.get('textColor', '#f59e0b'), "&H000BB7F5&")
    stroke_color_ass = hex_to_ass_color(settings.get('strokeColor', '#000000'), "&H00000000&")

    # MarginV based on new_sub_box Y percentage
    box_y = float(new_sub_box.get('y', 78))
    margin_v = int(720 * (1.0 - (box_y / 100.0)) - 30)
    if margin_v < 10:
        margin_v = 30

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

    # Boxblur parameters from old_sub_box (ensure even dimensions)
    bx = max(0, int(float(old_sub_box.get('x', 18)) / 100.0 * 1280))
    by = max(0, int(float(old_sub_box.get('y', 72)) / 100.0 * 720))
    bw = max(20, int(float(old_sub_box.get('width', 32)) / 100.0 * 1280))
    bh = max(10, int(float(old_sub_box.get('height', 9)) / 100.0 * 720))

    if bw % 2 != 0: bw += 1
    if bh % 2 != 0: bh += 1
    if bx % 2 != 0: bx += 1
    if by % 2 != 0: by += 1

    blur_r = max(5, int(settings.get('blurRadius', 25)))
    blur_luma = max(2, min(14, int(blur_r / 2)))
    blur_chroma = max(1, min(7, int(blur_luma / 2)))

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
                "-filter_complex", f"[0:v]crop=w={bw}:h={bh}:x={bx}:y={by},boxblur={blur_r}:1[blurred];[0:v][blurred]overlay=x={bx}:y={by}[vblurred];[vblurred]subtitles=filename='{srt_rel}'{anti_part}[vout];{audio_filter_part}",
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
                "-filter_complex", f"[0:v]crop=w={bw}:h={bh}:x={bx}:y={by},boxblur={blur_r}:1[blurred];[0:v][blurred]overlay=x={bx}:y={by}{anti_part}[vout]",
                "-map", "[vout]",
                "-map", "0:a?",
                "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                "-c:a", "copy",
            ] + anti_flags + [
                str(final_output)
            ]
        subprocess.run(cmd_fallback, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

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
    v_code = voice_code_map.get(voice, "vi-VN-NamMinhNeural")

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

    emit_progress(task_id, 65, "Tạo BGM & Background", f"Trộn nhạc nền du dương ({int(total_sec)}s) và thiết kế khung hình 1080p...")

    enc_name, enc_flags, enc_label = detect_gpu_encoder(ffmpeg_exe)
    safe_title = title.replace("'", "").replace(":", "")[:35]

    cmd_render = [
        ffmpeg_exe, "-y",
        "-f", "lavfi", "-i", f"color=c=#0b1120:s=1280x720:d={total_sec:.2f}",
        "-i", str(voice_mp3),
        "-filter_complex", (
            f"[0:v]drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='{safe_title}':fontsize=42:fontcolor=#f59e0b:x=(w-text_w)/2:y=200,"
            f"drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='SẢN XUẤT TRUYỆN AUDIO & PODCAST AI':fontsize=20:fontcolor=#94a3b8:x=(w-text_w)/2:y=265[vout];"
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
                f"[0:v]drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='{safe_title}':fontsize=38:fontcolor=#f59e0b:x=(w-text_w)/2:y=200[vout];"
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
    parser.add_argument("--source", type=str, required=True)
    parser.add_argument("--output-dir", type=str, default="C:\\Output")
    parser.add_argument("--config", type=str, default="{}")
    args = parser.parse_args()

    task_id = args.task_id
    source = args.source
    output_dir = Path(args.output_dir)

    try:
        config = json.loads(args.config)
    except Exception:
        config = {}

    settings = config.get("settings", config)
    old_sub_box = config.get("oldSubBlurBox", config.get("old_sub_blur_box", {"x": 18, "y": 72, "width": 32, "height": 9}))
    new_sub_box = config.get("newSubBox", config.get("new_sub_box", {"x": 20, "y": 78, "width": 60, "height": 11}))
    gemini_key = config.get("geminiApiKey", config.get("gemini_api_key", settings.get("geminiApiKey", settings.get("gemini_api_key", ""))))
    groq_key = config.get("groqApiKey", config.get("groq_api_key", settings.get("groqApiKey", settings.get("groq_api_key", ""))))
    cookie_data = config.get("douyinCookie", config.get("douyin_cookie", settings.get("douyinCookie", settings.get("douyin_cookie", ""))))

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
        video_raw = step_download_or_copy(task_id, source, temp_dir, cookie_data)

        # Check AI Engine Mode: Native CapCut Pro vs Hybrid Pro vs Cloud Local
        ai_engine_mode = settings.get("aiEngineMode", "CAPCUT_PRO_NATIVE")
        render_engine = settings.get("renderEngine", "FFmpeg Siêu Tốc (Chạy ngầm 100%)")
        custom_draft_dir = config.get("capcutDraftDir", "")
        custom_capcut_exe = config.get("capcutExePath", "")

        is_capcut_draft_only = ("nháp" in render_engine.lower() or "draft" in render_engine.lower())
        is_capcut_auto = (
            ai_engine_mode in ["CAPCUT_PRO_NATIVE", "HYBRID_PRO"] or
            "capcut" in render_engine.lower() or
            "tự động hóa capcut" in render_engine.lower()
        ) and not is_capcut_draft_only

        if is_capcut_auto:
            emit_progress(task_id, 20, "CapCut Auto Pipeline", f"Khởi động mô hình Tự Động Hóa CapCut Pro 5 Bước ({ai_engine_mode})...")
            from capcut_draft_generator import create_capcut_draft
            from capcut_ui_controller import run_native_capcut_pro_pipeline, open_draft_and_export

            # Step 1 & 2: Setup Draft & Visual Masking
            emit_progress(task_id, 25, "BƯỚC 1 & 2: Nạp & Căn Sửa", "[CapCut Auto] Nạp Video gốc, căn canvas & áp dụng mặt nạ Blur che sub cũ...")
            subtitles_trans = []
            tts_segments = []
            voice_wav = None

            account_type = settings.get("capcutAccountType", "PRO")
            is_free_account = (account_type.upper() == "FREE")

            if is_free_account or ai_engine_mode in ["HYBRID_PRO", "CLOUD_LOCAL"] or "tự động hóa capcut" in render_engine.lower():
                # For FREE CapCut accounts: we pre-generate Subtitles & Voice via AI (Gemini + Edge-TTS)
                # and inject directly into Timeline so CapCut PC exports freely without hitting the PRO Paywall!
                emit_progress(task_id, 35, "BƯỚC 3: Dịch Ngữ Cảnh", "[CapCut Free Safe] Bóc tách & Dịch ngữ cảnh chuẩn văn phong bằng Gemini...")
                subtitles = step_extract_and_transcribe(task_id, video_raw, temp_dir, groq_key, gemini_key)
                genre = settings.get("genre", "Tự động")
                quality = settings.get("translationQuality", "Tự nhiên / văn nói")
                subtitles_trans = step_gemini_translation(task_id, subtitles, genre, quality, gemini_key)

                # Generate TTS for timeline
                voice_name = settings.get("voice", "Cô Gái Hoạt Ngôn (vi-VN)")
                speed = float(settings.get("speed", 1.0))
                voice_wav = step_tts_synthesis(task_id, subtitles_trans, temp_dir, voice_name, speed)

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

            # Create comprehensive Draft Project
            draft_folder = create_capcut_draft(
                project_name=f"Reup_{task_id}",
                raw_video_path=video_raw,
                tts_audio_segments=tts_segments,
                settings=settings,
                old_sub_box=old_sub_box,
                new_sub_box=new_sub_box,
                custom_draft_dir=custom_draft_dir
            )

            vip_voice = settings.get("capcutVipVoice", "Cô Gái Hoạt Ngôn")
            sync_speed = settings.get("capcutSyncSpeed", True)
            account_type = settings.get("capcutAccountType", "PRO")

            # Step 3, 4, 5: UI Automation (Auto Sub, Voice Sync, Export)
            try:
                run_native_capcut_pro_pipeline(
                    project_name=f"Reup_{task_id}",
                    output_filename=f"Reup_{task_id}",
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

            final_mp4 = output_dir / f"Reup_{task_id}.mp4"
            if not final_mp4.exists() or final_mp4.stat().st_size == 0:
                # Guaranteed render fallback via FFmpeg if CapCut UI did not export file directly
                emit_progress(task_id, 92, "Hoàn thiện Render", "Tối ưu hóa file xuất thành phẩm bằng FFmpeg siêu tốc...")
                if not subtitles_trans:
                    subtitles = step_extract_and_transcribe(task_id, video_raw, temp_dir, groq_key, gemini_key)
                    subtitles_trans = step_gemini_translation(task_id, subtitles, settings.get("genre", "Tự động"), settings.get("translationQuality", "Tự nhiên / văn nói"), gemini_key)
                    voice_wav = step_tts_synthesis(task_id, subtitles_trans, temp_dir, settings.get("voice", "Cô Gái Hoạt Ngôn (vi-VN)"), float(settings.get("speed", 1.0)))
                final_mp4 = step_render_video(
                    task_id, video_raw, voice_wav, subtitles_trans, temp_dir, output_dir, settings, old_sub_box, new_sub_box, anti_settings=anti_settings
                )
                emit_done(task_id, str(final_mp4.resolve()), f"CapCut chưa xuất được file, đã hoàn tất xuất video qua FFmpeg: {final_mp4.name}")
                return

            emit_done(task_id, str(final_mp4.resolve()), f"Quy trình Tự Động Hóa CapCut Pro ({ai_engine_mode}) hoàn tất: {final_mp4.name}")
            return

        # Step 2: Extract & ASR (For Cloud / Local mode)
        subtitles = step_extract_and_transcribe(task_id, video_raw, temp_dir, groq_key, gemini_key)

        # Step 3: Contextual Translation
        genre = settings.get("genre", "Tự động")
        quality = settings.get("translationQuality", "Tự nhiên / văn nói")
        subtitles_trans = step_gemini_translation(task_id, subtitles, genre, quality, gemini_key)

        # Step 4: TTS Voice
        voice_name = settings.get("voice", "Cô Gái Hoạt Ngôn (vi-VN)")
        speed = float(settings.get("speed", 1.0))
        voice_wav = step_tts_synthesis(task_id, subtitles_trans, temp_dir, voice_name, speed)

        # Step 5: Render Video / CapCut Draft Injection
        render_engine = settings.get("renderEngine", "ffmpeg")
        custom_draft_dir = config.get("capcutDraftDir", "")
        custom_capcut_exe = config.get("capcutExePath", "")

        if is_capcut_draft_only:
            emit_progress(task_id, 85, "CapCut Draft", "Bơm Timeline vào dự án CapCut PC (com.lveditor.draft)...")
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
                project_name=f"Reup_{task_id}",
                raw_video_path=video_raw,
                tts_audio_segments=tts_segments,
                settings=settings,
                old_sub_box=old_sub_box,
                new_sub_box=new_sub_box,
                custom_draft_dir=custom_draft_dir
            )
            emit_done(task_id, str(draft_folder.resolve()), "Đã tạo Draft CapCut hoàn tất. Mở CapCut PC để xem dự án.")

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
                task_id, video_raw, voice_wav, subtitles_trans, temp_dir, output_dir, settings, old_sub_box, new_sub_box, anti_settings=anti_settings
            )
            emit_done(task_id, str(final_video.resolve()), "Tự động hóa CapCut và render video hoàn tất.")

        else:
            # Default: FFmpeg Super Fast
            final_video = step_render_video(
                task_id, video_raw, voice_wav, subtitles_trans, temp_dir, output_dir, settings, old_sub_box, new_sub_box, anti_settings=anti_settings
            )
            emit_done(task_id, str(final_video.resolve()), "Render video và hoàn tất toàn bộ quy trình")

    except Exception as e:
        emit_error(task_id, f"Lỗi không xác định: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
