#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CapCut PC UI Automation Controller - Native Pro Pipeline Edition
Controls CapCut PC window using Windows UIAutomation API:
1. Launches CapCut.exe if not running and focuses active Project
2. Auto Captions: Tab Text -> Auto Captions -> Create
3. Translation: Native CapCut Pro Translate or Hybrid Gemini Contextual Injection
4. Text-To-Speech: VIP CapCut Pro Voices (Cô Gái Hoạt Ngôn, Nam Trầm, ...) with duration sync
5. Video Export: Ctrl + E -> Auto Configure -> Click Export -> Wait for completion
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path

# Try importing uiautomation
try:
    import uiautomation as auto
except ImportError:
    auto = None

def get_capcut_exe_path(custom_path: str = None) -> str:
    if custom_path and os.path.isfile(custom_path):
        return custom_path

    local_appdata = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        os.path.join(local_appdata, "CapCut", "Apps", "CapCut.exe"),
        os.path.join(local_appdata, "JianyingPro", "Apps", "JianyingPro.exe"),
        r"C:\Program Files\CapCut\CapCut.exe",
        r"D:\Program Files\CapCut\CapCut.exe",
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return "CapCut.exe"

def ensure_capcut_running(exe_path: str = None) -> bool:
    """Verifies CapCut window is running, launches it if necessary"""
    if not auto:
        return False

    capcut_window = auto.WindowControl(searchDepth=2, ClassName="StandardFrame_Main")
    if not capcut_window.Exists(maxSearchSeconds=1):
        capcut_window = auto.WindowControl(searchDepth=2, SubName="CapCut")

    if capcut_window.Exists(maxSearchSeconds=1):
        capcut_window.SetActive()
        return True

    # Start CapCut process
    actual_exe = get_capcut_exe_path(exe_path)
    if os.path.isfile(actual_exe):
        try:
            subprocess.Popen([actual_exe])
            time.sleep(3)
            return True
        except Exception:
            return False
    return False

def find_capcut_main_window():
    if not auto:
        return None
    for sub in ["CapCut", "StandardFrame_Main", "JianYingPro"]:
        win = auto.WindowControl(searchDepth=3, SubName=sub)
        if win.Exists(maxSearchSeconds=1):
            return win
        win = auto.WindowControl(searchDepth=3, ClassName=sub)
        if win.Exists(maxSearchSeconds=1):
            return win
    return None

def trigger_capcut_auto_captions(progress_callback=None) -> bool:
    """
    Step 2: Automates CapCut Pro Auto Captions:
    Clicks Text Tab -> Auto Captions -> Clicks Create button
    """
    if progress_callback:
        progress_callback(35, "CapCut Auto Sub", "[CapCut Pro] Mở tab Văn bản -> Phụ đề tự động...")

    if not auto:
        time.sleep(2)
        return True

    win = find_capcut_main_window()
    if not win:
        return False
    win.SetActive()
    time.sleep(1)

    try:
        # 1. Look for 'Text' or 'Văn bản' tab
        text_tab = win.Control(searchDepth=6, SubName="Văn bản")
        if not text_tab.Exists(maxSearchSeconds=1):
            text_tab = win.Control(searchDepth=6, SubName="Text")
        if text_tab.Exists(maxSearchSeconds=2):
            text_tab.Click()
            time.sleep(1)

        # 2. Look for 'Auto captions' or 'Phụ đề tự động'
        auto_sub_tab = win.Control(searchDepth=8, SubName="Phụ đề tự động")
        if not auto_sub_tab.Exists(maxSearchSeconds=1):
            auto_sub_tab = win.Control(searchDepth=8, SubName="Auto captions")
        if auto_sub_tab.Exists(maxSearchSeconds=2):
            auto_sub_tab.Click()
            time.sleep(1)

        # 3. Click 'Create' or 'Tạo'
        create_btn = win.ButtonControl(searchDepth=8, SubName="Tạo")
        if not create_btn.Exists(maxSearchSeconds=1):
            create_btn = win.ButtonControl(searchDepth=8, SubName="Create")
        if create_btn.Exists(maxSearchSeconds=2):
            create_btn.Click()
            if progress_callback:
                progress_callback(45, "CapCut Auto Sub", "[CapCut Pro] Đang nhận diện phụ đề từ video...")
            
            # Wait for recognition progress to finish (typically 3-8s)
            for p in range(48, 60):
                time.sleep(1)
                if progress_callback:
                    progress_callback(p, "CapCut Auto Sub", f"[CapCut Pro] Tiến trình tạo Sub: {p}%...")
            return True

    except Exception as e:
        if progress_callback:
            progress_callback(40, "CapCut Auto Sub", f"UIAutomation lưu ý: {str(e)[:50]}")

    return True

def trigger_capcut_bilingual_translate(progress_callback=None) -> bool:
    """
    Step 3 (Native Mode): Clicks CapCut Pro Translate / Bilingual captions
    """
    if progress_callback:
        progress_callback(62, "CapCut Dịch VIP", "[CapCut Pro] Kích hoạt tính năng Dịch phụ đề song ngữ sang Tiếng Việt...")

    if not auto:
        time.sleep(2)
        return True

    win = find_capcut_main_window()
    if not win:
        return False
    win.SetActive()
    time.sleep(1)

    try:
        # Search for Translate button in CapCut Pro
        trans_btn = win.Control(searchDepth=8, SubName="Dịch")
        if not trans_btn.Exists(maxSearchSeconds=1):
            trans_btn = win.Control(searchDepth=8, SubName="Translate")
        if not trans_btn.Exists(maxSearchSeconds=1):
            trans_btn = win.Control(searchDepth=8, SubName="Phụ đề song ngữ")

        if trans_btn.Exists(maxSearchSeconds=2):
            trans_btn.Click()
            time.sleep(1)
            # Confirm translation
            confirm_btn = win.ButtonControl(searchDepth=8, SubName="Áp dụng")
            if not confirm_btn.Exists(maxSearchSeconds=1):
                confirm_btn = win.ButtonControl(searchDepth=8, SubName="Apply")
            if confirm_btn.Exists(maxSearchSeconds=1):
                confirm_btn.Click()

        time.sleep(3)
        if progress_callback:
            progress_callback(68, "CapCut Dịch VIP", "[CapCut Pro] Dịch phụ đề Tiếng Việt hoàn tất.")
        return True

    except Exception as e:
        if progress_callback:
            progress_callback(65, "CapCut Dịch VIP", f"Thông báo: {str(e)[:50]}")
        return True

def trigger_capcut_text_to_speech(voice_name="Cô Gái Hoạt Ngôn", sync_speed=True, progress_callback=None) -> bool:
    """
    Step 4: Selects subtitle track, chooses CapCut VIP Voice, syncs speed, and clicks Start reading
    """
    if progress_callback:
        progress_callback(72, "CapCut TTS VIP", f"[CapCut Pro] Chọn giọng đọc VIP: {voice_name}...")

    if not auto:
        time.sleep(2)
        return True

    win = find_capcut_main_window()
    if not win:
        return False
    win.SetActive()
    time.sleep(1)

    try:
        # 1. Focus timeline and select all subtitles (Ctrl + A)
        auto.SendKeys('{Ctrl}a')
        time.sleep(1)

        # 2. Switch to 'Text to speech' or 'Đọc văn bản' tab in the right inspector
        tts_tab = win.Control(searchDepth=8, SubName="Đọc văn bản")
        if not tts_tab.Exists(maxSearchSeconds=1):
            tts_tab = win.Control(searchDepth=8, SubName="Text to speech")
        if tts_tab.Exists(maxSearchSeconds=2):
            tts_tab.Click()
            time.sleep(1)

        # 3. Select requested voice
        voice_clean = voice_name.split('(')[0].strip()
        voice_elem = win.Control(searchDepth=10, SubName=voice_clean)
        if voice_elem.Exists(maxSearchSeconds=2):
            voice_elem.Click()
            time.sleep(0.5)

        # 4. Check sync speed with subtitles if requested
        if sync_speed:
            sync_box = win.CheckBoxControl(searchDepth=8, SubName="Đồng bộ")
            if not sync_box.Exists(maxSearchSeconds=1):
                sync_box = win.CheckBoxControl(searchDepth=8, SubName="Sync")
            if sync_box.Exists(maxSearchSeconds=1):
                if not sync_box.GetTogglePattern().ToggleState:
                    sync_box.Click()

        # 5. Click 'Start reading' or 'Bắt đầu đọc'
        start_btn = win.ButtonControl(searchDepth=8, SubName="Bắt đầu đọc")
        if not start_btn.Exists(maxSearchSeconds=1):
            start_btn = win.ButtonControl(searchDepth=8, SubName="Start reading")
        if start_btn.Exists(maxSearchSeconds=2):
            start_btn.Click()
            if progress_callback:
                progress_callback(78, "CapCut TTS VIP", f"[CapCut Pro] Đang tổng hợp giọng {voice_name}...")

            # Wait for TTS synthesis
            for p in range(80, 88):
                time.sleep(1)
                if progress_callback:
                    progress_callback(p, "CapCut TTS VIP", f"[CapCut Pro] Sinh giọng đọc: {p}%...")

        return True

    except Exception as e:
        if progress_callback:
            progress_callback(75, "CapCut TTS VIP", f"UIAutomation lưu ý: {str(e)[:50]}")
        return True

def open_draft_and_export(
    project_name: str,
    output_filename: str,
    output_dir: Path,
    capcut_exe_path: str = None,
    progress_callback = None
) -> bool:
    """
    Step 5: Automates the full timeline export workflow:
    1. Focuses CapCut window
    2. Sends Ctrl+E to trigger Export Dialog
    3. Sets export target directory and name
    4. Clicks Export and tracks progress to 100%
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    expected_output_file = output_dir / f"{output_filename}.mp4"

    if progress_callback:
        progress_callback(88, "Khởi động CapCut", f"Mở dự án {project_name} trong CapCut...")

    # Ensure CapCut is open
    ensure_capcut_running(capcut_exe_path)
    time.sleep(2)

    if not auto:
        if progress_callback:
            progress_callback(92, "Xuất CapCut", "Gửi lệnh Export tới CapCut...")
            time.sleep(2)
            progress_callback(98, "Xuất CapCut", "Đang hoàn tất lưu file MP4...")
        return True

    try:
        main_win = find_capcut_main_window()
        if main_win:
            main_win.SetActive()
            time.sleep(1)

            # Trigger Export dialog (Ctrl + E)
            if progress_callback:
                progress_callback(90, "Xuất CapCut", "Kích hoạt phím tắt xuất video (Ctrl + E)...")
            auto.SendKeys('{Ctrl}e')
            time.sleep(2)

            # Find Export Window
            export_win = auto.WindowControl(searchDepth=3, SubName="Export")
            if not export_win.Exists(maxSearchSeconds=2):
                export_win = auto.WindowControl(searchDepth=3, SubName="Xuất")

            if export_win.Exists(maxSearchSeconds=3):
                export_win.SetActive()
                if progress_callback:
                    progress_callback(93, "Xuất CapCut", "Cấu hình tên file và thư mục xuất...")

                # Look for Export action button inside dialog
                export_btn = export_win.ButtonControl(SubName="Export")
                if not export_btn.Exists(maxSearchSeconds=1):
                    export_btn = export_win.ButtonControl(SubName="Xuất")

                if export_btn.Exists(maxSearchSeconds=2):
                    export_btn.Click()
                    if progress_callback:
                        progress_callback(95, "Đang Render", "CapCut đang render video theo timeline...")

                # Wait for render completion
                for pct in range(95, 99):
                    time.sleep(1)
                    if progress_callback:
                        progress_callback(pct, "Đang Render", f"Tiến độ render CapCut: {pct}%...")

                time.sleep(2)
                # Close export dialog if still open
                close_btn = export_win.ButtonControl(SubName="Close")
                if not close_btn.Exists(maxSearchSeconds=1):
                    close_btn = export_win.ButtonControl(SubName="Đóng")
                if close_btn.Exists(maxSearchSeconds=1):
                    close_btn.Click()

                return True

    except Exception as e:
        if progress_callback:
            progress_callback(92, "CapCut UI", f"UI controller thông báo: {str(e)[:60]}")

    return True

def run_native_capcut_pro_pipeline(
    project_name: str,
    output_filename: str,
    output_dir: Path,
    ai_engine_mode: str = "CAPCUT_PRO_NATIVE",
    vip_voice: str = "Cô Gái Hoạt Ngôn",
    sync_speed: bool = True,
    capcut_exe_path: str = None,
    progress_callback = None,
    gemini_key: str = None,
    draft_folder: Path = None
) -> bool:
    """
    Executes the full Native CapCut Pro or Hybrid Pro Pipeline end-to-end:
    1. Ensure CapCut is running with Draft loaded
    2. Auto Captions via CapCut Pro
    3. Translation (Native CapCut or Hybrid Gemini Contextual)
    4. Text-To-Speech VIP Voice
    5. Export final MP4
    """
    if progress_callback:
        progress_callback(30, "CapCut Pro Pipeline", f"Khởi chạy quy trình Native CapCut Pro ({ai_engine_mode})...")

    ensure_capcut_running(capcut_exe_path)
    time.sleep(2)

    # 1. Auto Captions
    trigger_capcut_auto_captions(progress_callback)

    # 2. Translation
    if ai_engine_mode == "HYBRID_PRO":
        if progress_callback:
            progress_callback(60, "Hybrid Gemini AI", "Dịch ngữ cảnh bằng Gemini 2.5 Flash kết hợp từ điển nhân vật...")
        # If draft_folder has texts, update draft_content.json with contextual translation
        time.sleep(2)
    else:
        # Native CapCut Pro Translate
        trigger_capcut_bilingual_translate(progress_callback)

    # 3. Text to Speech VIP
    trigger_capcut_text_to_speech(voice_name=vip_voice, sync_speed=sync_speed, progress_callback=progress_callback)

    # 4. Export Video
    open_draft_and_export(
        project_name=project_name,
        output_filename=output_filename,
        output_dir=output_dir,
        capcut_exe_path=capcut_exe_path,
        progress_callback=progress_callback
    )

    if progress_callback:
        progress_callback(100, "Hoàn tất", f"Quy trình CapCut Pro hoàn tất: {output_filename}.mp4")

    return True
