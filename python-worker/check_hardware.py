#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hardware & Dependency Doctor Checker
Outputs JSON with:
- GPU model & detected FFmpeg encoder (NVENC / AMF / QSV / libx264)
- CPU usage percentage
- RAM usage in MB
- Dependency status: ffmpeg, ffprobe, yt-dlp
"""

import sys
import os
import json
import shutil
import subprocess
import time
from pathlib import Path

def get_ffmpeg_path():
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        return ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    base_dir = Path(__file__).resolve().parent.parent
    candidates = [
        base_dir / "bin" / "ffmpeg" / "ffmpeg.exe",
        base_dir / "bin" / "ffmpeg.exe",
        base_dir / "src-tauri" / "bin" / "ffmpeg.exe",
    ]
    prog_files = os.environ.get("ProgramFiles", "")
    if prog_files:
        candidates.append(Path(prog_files) / "ffmpeg" / "bin" / "ffmpeg.exe")
    for c in candidates:
        if c.exists():
            return str(c)
    return None

def check_gpu_and_encoder(ffmpeg_exe):
    gpu_name = "Không xác định"
    try:
        import subprocess
        res = subprocess.run(
            ["powershell", "-Command", "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"],
            capture_output=True, text=True, timeout=3
        )
        lines = [line.strip() for line in res.stdout.splitlines() if line.strip()]
        if lines:
            gpu_name = lines[0]
    except Exception:
        pass

    if not ffmpeg_exe or not os.path.exists(ffmpeg_exe):
        return {
            "gpu_name": gpu_name,
            "encoder": "none",
            "encoder_label": "FFmpeg chưa cài đặt",
            "is_hardware_accel": False
        }

    candidates = [
        ("h264_nvenc", ["-c:v", "h264_nvenc", "-preset", "p4"], f"GPU: NVIDIA NVENC ({gpu_name})", True),
        ("h264_amf", ["-c:v", "h264_amf"], f"GPU: AMD AMF ({gpu_name})", True),
        ("h264_qsv", ["-c:v", "h264_qsv"], f"GPU: Intel QSV ({gpu_name})", True),
        ("libx264", ["-c:v", "libx264", "-preset", "veryfast"], "CPU: libx264 (Tối ưu đa luồng)", False),
    ]

    for enc, flags, label, is_hw in candidates:
        cmd = [ffmpeg_exe, "-y", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=0.05"] + flags + ["-f", "null", "-"]
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
            if res.returncode == 0:
                return {
                    "gpu_name": gpu_name,
                    "encoder": enc,
                    "encoder_label": label,
                    "is_hardware_accel": is_hw
                }
        except Exception:
            continue

    return {
        "gpu_name": gpu_name,
        "encoder": "libx264",
        "encoder_label": "CPU: libx264",
        "is_hardware_accel": False
    }

def check_dependencies():
    base_dir = Path(__file__).resolve().parent.parent
    ffmpeg_exe = get_ffmpeg_path()
    ffprobe_exe = shutil.which("ffprobe")
    if not ffprobe_exe:
        for c in [
            base_dir / "bin" / "ffmpeg" / "ffprobe.exe",
            base_dir / "bin" / "ffprobe.exe",
            base_dir / "src-tauri" / "bin" / "ffprobe.exe"
        ]:
            if c.exists():
                ffprobe_exe = str(c)
                break

    ytdlp_exe = shutil.which("yt-dlp")
    if not ytdlp_exe:
        py_scripts = Path(sys.executable).parent / "Scripts" / "yt-dlp.exe"
        candidates = [
            py_scripts,
            base_dir / "bin" / "yt-dlp.exe",
            base_dir / "src-tauri" / "bin" / "yt-dlp.exe",
        ]
        for c in candidates:
            if c.exists():
                ytdlp_exe = str(c)
                break

    return {
        "ffmpeg": {"installed": ffmpeg_exe is not None, "path": ffmpeg_exe or ""},
        "ffprobe": {"installed": ffprobe_exe is not None or ffmpeg_exe is not None, "path": ffprobe_exe or ffmpeg_exe or ""},
        "ytdlp": {"installed": ytdlp_exe is not None, "path": ytdlp_exe or ""},
    }

def get_real_system_metrics():
    # 1. Real System RAM via Windows API
    ram_mb = 0
    total_ram_mb = 0
    cpu_percent = 0.0
    try:
        import ctypes
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ('dwLength', ctypes.c_ulong),
                ('dwMemoryLoad', ctypes.c_ulong),
                ('ullTotalPhys', ctypes.c_ulonglong),
                ('ullAvailPhys', ctypes.c_ulonglong),
                ('ullTotalPageFile', ctypes.c_ulonglong),
                ('ullAvailPageFile', ctypes.c_ulonglong),
                ('ullTotalVirtual', ctypes.c_ulonglong),
                ('ullAvailVirtual', ctypes.c_ulonglong),
                ('sullAvailExtendedVirtual', ctypes.c_ulonglong),
            ]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            total_ram_mb = stat.ullTotalPhys // (1024 * 1024)
            ram_mb = (stat.ullTotalPhys - stat.ullAvailPhys) // (1024 * 1024)
    except Exception:
        pass

    # 2. Real System CPU via GetSystemTimes
    try:
        import ctypes
        class FILETIME(ctypes.Structure):
            _fields_ = [('dwLowDateTime', ctypes.c_uint), ('dwHighDateTime', ctypes.c_uint)]
        def _to_int(ft):
            return (ft.dwHighDateTime << 32) + ft.dwLowDateTime
        def _get_times():
            idle, kernel, user = FILETIME(), FILETIME(), FILETIME()
            ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user))
            return _to_int(idle), _to_int(kernel), _to_int(user)
        i1, k1, u1 = _get_times()
        time.sleep(0.08)
        i2, k2, u2 = _get_times()
        idle_d = i2 - i1
        total_d = (k2 - k1) + (u2 - u1)
        if total_d > 0:
            cpu_percent = round(max(0.0, min(100.0, 100.0 * (1.0 - (idle_d / total_d)))), 1)
    except Exception:
        pass

    return {
        "ram_mb": ram_mb,
        "total_ram_mb": total_ram_mb,
        "cpu_percent": cpu_percent,
        "platform": f"Windows ({sys.platform})",
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    }

def main():
    ffmpeg_path = get_ffmpeg_path()
    gpu_info = check_gpu_and_encoder(ffmpeg_path)
    deps = check_dependencies()
    sys_metrics = get_real_system_metrics()

    data = {
        "hardware": gpu_info,
        "dependencies": deps,
        "system": sys_metrics
    }
    print(json.dumps(data, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

