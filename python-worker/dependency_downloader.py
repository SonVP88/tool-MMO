#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dependency Downloader & Doctor
Downloads yt-dlp.exe and ffmpeg.exe into bin/ folder automatically
if missing on client machines.
"""

import sys
import os
import shutil
import zipfile
import urllib.request
from pathlib import Path

def download_file(url: str, dest_path: Path, label: str):
    print(f"[DOWNLOAD_START] {label} từ {url}...", flush=True)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    
    def report(count, block_size, total_size):
        if total_size > 0:
            pct = int(count * block_size * 100 / total_size)
            if pct % 20 == 0:
                print(f"[PROGRESS] {label}: {pct}%", flush=True)

    urllib.request.urlretrieve(url, str(dest_path), reporthook=report)
    print(f"[DOWNLOAD_DONE] Đã lưu {label} tại {dest_path}", flush=True)

def ensure_bin_directory():
    # Candidates for local bin directory
    base_dir = Path(__file__).resolve().parent.parent
    bin_dir = base_dir / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    tauri_bin = base_dir / "src-tauri" / "bin"
    tauri_bin.mkdir(parents=True, exist_ok=True)
    return bin_dir, tauri_bin

def auto_setup_dependencies():
    bin_dir, tauri_bin = ensure_bin_directory()
    print(f"=== BÁC SĨ HỆ THỐNG: KIỂM TRA & CÀI ĐẶT CÔNG CỤ NỀN ===", flush=True)

    # 1. yt-dlp.exe
    ytdlp_target = bin_dir / "yt-dlp.exe"
    if not ytdlp_target.exists():
        # Check if already in Python Scripts
        py_ytdlp = Path(os.path.expanduser(r"~\AppData\Local\Python\pythoncore-3.14-64\Scripts\yt-dlp.exe"))
        if py_ytdlp.exists():
            shutil.copy2(py_ytdlp, ytdlp_target)
            print(f"[COPIED] Đã sao chép yt-dlp từ hệ thống vào bin/yt-dlp.exe", flush=True)
        else:
            url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
            try:
                download_file(url, ytdlp_target, "yt-dlp.exe")
            except Exception as e:
                print(f"[ERROR] Không thể tải yt-dlp: {e}", flush=True)
    else:
        print(f"[READY] yt-dlp.exe đã sẵn sàng trong bin/yt-dlp.exe", flush=True)

    # 2. ffmpeg.exe
    ffmpeg_target = bin_dir / "ffmpeg.exe"
    if not ffmpeg_target.exists():
        # Check imageio_ffmpeg
        try:
            import imageio_ffmpeg
            img_ffmpeg = Path(imageio_ffmpeg.get_ffmpeg_exe())
            if img_ffmpeg.exists():
                shutil.copy2(img_ffmpeg, ffmpeg_target)
                print(f"[COPIED] Đã sao chép FFmpeg từ imageio_ffmpeg vào bin/ffmpeg.exe", flush=True)
        except Exception:
            pass

    if not ffmpeg_target.exists():
        print(f"[DOWNLOAD] Đang tải gói nén FFmpeg essentials...", flush=True)
        # Fallback zip download
        zip_path = bin_dir / "ffmpeg.zip"
        url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
        try:
            download_file(url, zip_path, "FFmpeg.zip")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                for file_info in zip_ref.infolist():
                    if file_info.filename.endswith("ffmpeg.exe"):
                        file_info.filename = "ffmpeg.exe"
                        zip_ref.extract(file_info, bin_dir)
            if zip_path.exists():
                zip_path.unlink()
        except Exception as e:
            print(f"[ERROR] Không thể tải FFmpeg: {e}", flush=True)
    else:
        print(f"[READY] ffmpeg.exe đã sẵn sàng trong bin/ffmpeg.exe", flush=True)

    # Duplicate to src-tauri/bin for sidecar bundle if exists
    for f in ["ffmpeg.exe", "yt-dlp.exe"]:
        src = bin_dir / f
        dst = tauri_bin / f
        if src.exists() and not dst.exists():
            shutil.copy2(src, dst)

    print("=== HOÀN TẤT THIẾT LẬP CÔNG CỤ NỀN ===", flush=True)

if __name__ == "__main__":
    auto_setup_dependencies()

