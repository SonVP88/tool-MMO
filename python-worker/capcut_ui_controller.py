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

class CapCutOSD:
    """Floating On-Screen Display HUD Banner over CapCut window"""
    def __init__(self):
        self.status_file = Path("temp") / f"osd_status_{int(time.time() * 1000)}.json"
        self.status_file.parent.mkdir(parents=True, exist_ok=True)
        self.process = None

    def start(self, initial_msg="Đang khởi động điều khiển CapCut..."):
        try:
            with open(self.status_file, "w", encoding="utf-8") as f:
                json.dump({"active": True, "message": initial_msg}, f)
            hud_script = Path(__file__).parent / "osd_hud.py"
            if hud_script.exists():
                self.process = subprocess.Popen([sys.executable, str(hud_script), str(self.status_file)])
        except Exception:
            pass

    def update(self, msg: str):
        try:
            with open(self.status_file, "w", encoding="utf-8") as f:
                json.dump({"active": True, "message": msg}, f)
        except Exception:
            pass

    def stop(self, final_msg="Hoàn tất!", delay=2):
        try:
            self.update(final_msg)
            time.sleep(delay)
            with open(self.status_file, "w", encoding="utf-8") as f:
                json.dump({"active": False, "message": final_msg}, f)
            if self.process:
                self.process.terminate()
        except Exception:
            pass
        finally:
            try:
                if self.status_file.exists():
                    self.status_file.unlink()
            except Exception:
                pass

def get_capcut_exe_path(custom_path: str = None) -> str:
    if custom_path and os.path.isfile(custom_path):
        return custom_path

    local_appdata = os.environ.get("LOCALAPPDATA", "")
    pf = os.environ.get("ProgramFiles", "")
    pf_x86 = os.environ.get("ProgramFiles(x86)", "")
    candidates = [
        os.path.join(local_appdata, "CapCut", "Apps", "CapCut.exe"),
        os.path.join(local_appdata, "JianyingPro", "Apps", "JianyingPro.exe"),
        os.path.join(pf, "CapCut", "CapCut.exe") if pf else "",
        os.path.join(pf_x86, "CapCut", "CapCut.exe") if pf_x86 else "",
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            return c
    return "CapCut.exe"

def bring_window_to_front(win):
    """Restores a minimized/background CapCut window and brings it cleanly to the foreground."""
    if not win:
        return
    try:
        import ctypes
        hwnd = getattr(win, "NativeWindowHandle", None)
        if hwnd:
            # SW_RESTORE = 9 (restores if minimized without resizing maximized windows improperly)
            if ctypes.windll.user32.IsIconic(hwnd):
                ctypes.windll.user32.ShowWindow(hwnd, 9)
            ctypes.windll.user32.SetForegroundWindow(hwnd)
    except Exception:
        pass
    try:
        win.SetActive()
    except Exception:
        pass

def is_inside_editor(win) -> bool:
    """Checks if the currently open CapCut window is inside a Project Editor (vs Home screen)."""
    if not auto or not win:
        return False
    for tab_name in ["Captions", "Phụ đề", "Text", "Văn bản", "Media", "Phương tiện", "Audio", "Âm thanh"]:
        try:
            t = win.Control(searchDepth=6, SubName=tab_name)
            if t.Exists(maxSearchSeconds=0.35):
                return True
        except Exception:
            pass
    return False

def get_capcut_status(custom_path: str = None) -> dict:
    """Returns real-time status of CapCut PC on this machine (for UI status badge & smart control)."""
    exe_path = get_capcut_exe_path(custom_path)
    win = find_capcut_main_window()
    if not win:
        return {
            "is_running": False,
            "screen_state": "CLOSED",
            "window_title": "",
            "exe_installed": os.path.isfile(exe_path),
            "exe_path": exe_path
        }
    title = ""
    try:
        title = win.Name or ""
    except Exception:
        pass
    in_editor = is_inside_editor(win)
    return {
        "is_running": True,
        "screen_state": "EDITOR" if in_editor else "HOME",
        "window_title": title,
        "exe_installed": True,
        "exe_path": exe_path
    }

def ensure_capcut_running(exe_path: str = None) -> bool:
    """Verifies CapCut window is running, restores & focuses it if already open, or launches it if closed."""
    if not auto:
        return False

    win = find_capcut_main_window()
    if win:
        bring_window_to_front(win)
        return True

    # Start CapCut process
    actual_exe = get_capcut_exe_path(exe_path)
    if os.path.isfile(actual_exe):
        try:
            subprocess.Popen([actual_exe])
            for _ in range(12):
                time.sleep(1)
                win = find_capcut_main_window()
                if win:
                    bring_window_to_front(win)
                    return True
            return True
        except Exception:
            return False
    return False

def find_capcut_main_window():
    if not auto:
        return None
    for sub in ["StandardFrame_Main", "CapCut", "JianYingPro"]:
        try:
            win = auto.WindowControl(searchDepth=3, ClassName=sub)
            if win.Exists(maxSearchSeconds=0.6):
                return win
        except Exception:
            pass
        try:
            win = auto.WindowControl(searchDepth=3, SubName=sub)
            if win.Exists(maxSearchSeconds=0.6):
                return win
        except Exception:
            pass
    return None

def return_to_home_screen(win, progress_callback=None) -> bool:
    """If CapCut is already open inside another project, cleanly navigates back to the Home screen."""
    if not auto or not win:
        return False
    bring_window_to_front(win)
    if progress_callback:
        progress_callback(31, "CapCut Đang Mở", "Phát hiện CapCut đang mở dự án cũ -> Đang quay về Trang chủ để nạp dự án mới...")
    try:
        # Try clicking Menu -> Back to home page
        for menu_hint in ["Menu", "Trình đơn"]:
            menu_btn = win.Control(searchDepth=6, SubName=menu_hint)
            if menu_btn.Exists(maxSearchSeconds=0.8):
                menu_btn.Click()
                time.sleep(0.8)
                for home_hint in ["Back to home", "Trở về trang chủ", "Home page", "Trang chủ"]:
                    home_item = auto.Control(searchDepth=6, SubName=home_hint)
                    if home_item.Exists(maxSearchSeconds=0.8):
                        home_item.Click()
                        time.sleep(2.0)
                        return True
    except Exception:
        pass
    return False

def enter_project_editor(win, project_name: str = "", capcut_exe_path: str = None, progress_callback=None):
    """
    Smart project opener when CapCut is ALREADY OPEN or freshly launched:
    1. If already inside the exact target project editor -> stay and continue.
    2. If already open inside a DIFFERENT project -> return to Home screen first.
    3. On Home screen -> search for target project card. If CapCut was already open before draft injection
       and cached the old draft list, cleanly reload CapCut so it indexes the new draft, then open it!
    """
    if not auto or not win:
        return

    bring_window_to_front(win)
    win_title = ""
    try:
        win_title = (win.Name or "").lower()
    except Exception:
        pass

    # Case 1: Already inside the exact target project!
    if is_inside_editor(win):
        if not project_name or project_name.lower() in win_title:
            if progress_callback:
                progress_callback(33, "CapCut Sẵn Sàng", f"Đã kết nối trực tiếp với cửa sổ CapCut đang mở ({win.Name}).")
            return
        # Otherwise, CapCut is open on an OLD unrelated project -> go back to Home
        return_to_home_screen(win, progress_callback)
        win = find_capcut_main_window() or win
        bring_window_to_front(win)

    if progress_callback:
        progress_callback(32, "Mở Dự Án", f"Đang tìm và mở dự án '{project_name}' trên màn hình chính CapCut...")

    # Case 2: Look for the exact project card on Home screen
    search_hints = []
    if project_name:
        search_hints.append(project_name)
    search_hints.extend(["Reup_", "Dự án mới", "New project", "Bắt đầu tạo", "Start creating"])

    for hint in search_hints[:2]: # Check specific project first
        card = win.Control(searchDepth=8, SubName=hint)
        if card.Exists(maxSearchSeconds=1.2):
            card.Click()
            time.sleep(2.5)
            return

    # Case 3: CapCut was ALREADY OPEN before draft injection -> reload CapCut so it reads updated root_meta_info.json
    if project_name and sys.platform == "win32":
        exe = get_capcut_exe_path(capcut_exe_path)
        if os.path.isfile(exe):
            if progress_callback:
                progress_callback(33, "Làm Mới CapCut", "CapCut đang mở sẵn cache cũ -> Đang tải lại danh sách dự án mới nhất...")
            subprocess.run(["taskkill", "/F", "/IM", "CapCut.exe"], creationflags=0x08000000, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(1.5)
            subprocess.Popen([exe])
            for _ in range(15):
                time.sleep(1)
                win = find_capcut_main_window()
                if win:
                    break
            if win:
                bring_window_to_front(win)
                time.sleep(2)
                for hint in search_hints:
                    card = win.Control(searchDepth=8, SubName=hint)
                    if card.Exists(maxSearchSeconds=1.5):
                        card.Click()
                        time.sleep(2.5)
                        return

    # Fallback click first available project card
    for hint in search_hints:
        card = win.Control(searchDepth=8, SubName=hint)
        if card.Exists(maxSearchSeconds=1):
            card.Click()
            time.sleep(2)
            return

def trigger_capcut_auto_captions(enable_bilingual: bool = True, progress_callback=None) -> bool:
    """
    Step 2 (CapCut PC 2025/2026 Pro): Automates CapCut Pro Auto Captions + Bilingual Captions:
    1. Checks new top-level 'Captions' / 'Phụ đề' tab first, falls back to 'Text' / 'Văn bản'
    2. Clicks 'Auto captions' / 'Phụ đề tự động'
    3. Enables 'Bilingual captions' / 'Phụ đề song ngữ' -> Vietnamese if requested
    4. Clicks 'Generate' / 'Create' / 'Tạo' and waits for recognition completion
    """
    if progress_callback:
        progress_callback(35, "CapCut Auto Sub", "[CapCut Pro 2026] Mở tab Phụ đề -> Phụ đề tự động & Song ngữ...")

    if not auto:
        raise RuntimeError("Thư viện Windows UIAutomation không khả dụng trên hệ thống để điều khiển CapCut!")

    win = find_capcut_main_window()
    if not win:
        return False
    bring_window_to_front(win)
    time.sleep(0.8)

    try:
        # 1. CapCut PC 2025/2026 moved Auto Captions to top-level 'Captions' / 'Phụ đề' tab (fallback: 'Text' / 'Văn bản')
        tab_clicked = False
        for tab_label in ["Phụ đề", "Captions", "Văn bản", "Text"]:
            tab = win.Control(searchDepth=6, SubName=tab_label)
            if tab.Exists(maxSearchSeconds=0.8):
                tab.Click()
                tab_clicked = True
                time.sleep(0.8)
                break

        # 2. Look for 'Auto captions' or 'Phụ đề tự động'
        for sub_label in ["Phụ đề tự động", "Auto captions"]:
            auto_sub_tab = win.Control(searchDepth=8, SubName=sub_label)
            if auto_sub_tab.Exists(maxSearchSeconds=1.0):
                auto_sub_tab.Click()
                time.sleep(0.8)
                break

        # 3. Enable Bilingual Captions (CapCut Pro 2025/2026 feature) if present
        if enable_bilingual:
            for bi_label in ["Phụ đề song ngữ", "Bilingual captions"]:
                bi_chk = win.CheckBoxControl(searchDepth=8, SubName=bi_label)
                if bi_chk.Exists(maxSearchSeconds=0.8):
                    try:
                        if not bi_chk.GetTogglePattern().ToggleState:
                            bi_chk.Click()
                            time.sleep(0.5)
                    except Exception:
                        bi_chk.Click()
                        time.sleep(0.5)
                    break

        # 4. Click 'Generate' / 'Create' / 'Tạo'
        create_btn = None
        for btn_label in ["Tạo", "Generate", "Create"]:
            b = win.ButtonControl(searchDepth=8, SubName=btn_label)
            if b.Exists(maxSearchSeconds=1.0):
                create_btn = b
                break

        if create_btn:
            create_btn.Click()
            if progress_callback:
                progress_callback(45, "CapCut Auto Sub", "[CapCut Pro] Đang nhận diện giọng nói & tạo phụ đề tự động...")

            # Wait for recognition progress to finish
            for p in range(35):
                time.sleep(1)
                has_recognizing = (
                    win.Control(searchDepth=8, SubName="Recognizing").Exists(maxSearchSeconds=0.2) or
                    win.Control(searchDepth=8, SubName="Creating").Exists(maxSearchSeconds=0.2) or
                    win.Control(searchDepth=8, SubName="Đang nhận dạng").Exists(maxSearchSeconds=0.2) or
                    win.Control(searchDepth=8, SubName="Đang tạo").Exists(maxSearchSeconds=0.2)
                )
                if not has_recognizing and p >= 2:
                    break
                if progress_callback:
                    pct = min(58, 48 + p)
                    progress_callback(pct, "CapCut Auto Sub", f"[CapCut Pro] Đang nhận diện phụ đề: {pct}%...")
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
        raise RuntimeError("Thư viện Windows UIAutomation không khả dụng trên hệ thống để điều khiển CapCut!")

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
        raise RuntimeError("Thư viện Windows UIAutomation không khả dụng trên hệ thống để điều khiển CapCut!")

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

            # Wait for TTS synthesis to finish
            for p in range(30):
                time.sleep(1)
                has_generating = win.Control(searchDepth=8, SubName="Generating").Exists(maxSearchSeconds=0.2) or \
                                 win.Control(searchDepth=8, SubName="Đang tạo").Exists(maxSearchSeconds=0.2)
                if not has_generating and p >= 2:
                    break
                if progress_callback:
                    pct = min(88, 80 + p)
                    progress_callback(pct, "CapCut TTS VIP", f"[CapCut Pro] Đang đọc lồng tiếng: {pct}%...")

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
    account_type: str = "FREE",
    progress_callback = None
) -> bool:
    """
    Step 5: Automates the full timeline export workflow:
    1. Focuses CapCut window (restoring if minimized)
    2. Sends Ctrl+E to trigger Export Dialog
    3. Detects Pro Paywall immediately for FREE accounts so it never hangs
    4. Clicks Export and tracks render completion to 100%
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    is_pro = (str(account_type or "FREE").upper() == "PRO")
    mode_tag = "CapCut Pro" if is_pro else "CapCut Thường (Free)"

    if progress_callback:
        progress_callback(88, "Khởi động CapCut", f"[{mode_tag}] Chuẩn bị xuất dự án {project_name}...")

    ensure_capcut_running(capcut_exe_path)
    time.sleep(1.5)

    if not auto:
        raise RuntimeError("Thư viện Windows UIAutomation không khả dụng để gửi phím tắt xuất video tới CapCut!")

    try:
        main_win = find_capcut_main_window()
        if main_win:
            bring_window_to_front(main_win)
            time.sleep(0.8)

            # Trigger Export dialog (Ctrl + E)
            if progress_callback:
                progress_callback(90, "Xuất CapCut", f"[{mode_tag}] Kích hoạt hộp thoại xuất video (Ctrl + E)...")
            auto.SendKeys('{Ctrl}e')
            time.sleep(2)

            # Find Export Window
            export_win = auto.WindowControl(searchDepth=3, SubName="Export")
            if not export_win.Exists(maxSearchSeconds=2):
                export_win = auto.WindowControl(searchDepth=3, SubName="Xuất")

            if export_win.Exists(maxSearchSeconds=3):
                bring_window_to_front(export_win)
                if progress_callback:
                    progress_callback(93, "Xuất CapCut", f"[{mode_tag}] Xác nhận thông số xuất & bắt đầu Render...")

                # Look for Export action button inside dialog
                export_btn = export_win.ButtonControl(SubName="Export")
                if not export_btn.Exists(maxSearchSeconds=1):
                    export_btn = export_win.ButtonControl(SubName="Xuất")

                if export_btn.Exists(maxSearchSeconds=2):
                    export_btn.Click()
                    if progress_callback:
                        progress_callback(95, "Đang Render", f"[{mode_tag}] CapCut đang render video theo timeline...")

                time.sleep(2)
                # Check if CapCut blocked export with a Pro / VIP upgrade paywall dialog
                paywall_hit = False
                for pw_name in ["Join Pro", "Tham gia Pro", "Upgrade to Pro", "Nâng cấp Pro", "CapCut Pro"]:
                    pw = auto.WindowControl(searchDepth=4, SubName=pw_name)
                    if pw.Exists(maxSearchSeconds=0.5):
                        paywall_hit = True
                        if progress_callback:
                            progress_callback(94, "CapCut Cảnh Báo", f"[{mode_tag}] Phát hiện bảng yêu cầu PRO! Đang đóng bảng để chuyển xuất FFmpeg không mất phí...")
                        for close_hint in ["Cancel", "Hủy", "Close", "Đóng", "X"]:
                            btn_c = pw.ButtonControl(SubName=close_hint)
                            if btn_c.Exists(maxSearchSeconds=0.5):
                                btn_c.Click()
                                break
                        break
                if paywall_hit and not is_pro:
                    return False

                # Actively wait for CapCut render completion
                start_render_time = time.time()
                is_finished = False
                target_video = Path(output_dir) / f"{output_filename}.mp4"

                for step in range(150): # Polling up to 5 minutes
                    time.sleep(2)
                    elapsed = int(time.time() - start_render_time)

                    # Check for completion buttons in export window
                    for done_label in ["Open folder", "Mở thư mục", "OK", "Complete", "Hoàn thành"]:
                        done_btn = export_win.ButtonControl(SubName=done_label)
                        if done_btn.Exists(maxSearchSeconds=0.3):
                            is_finished = True
                            if progress_callback:
                                progress_callback(99, "Đang Render", f"[{mode_tag}] CapCut render hoàn tất trong {elapsed}s.")
                            break
                    if is_finished:
                        break

                    # Check if output file is created and stable
                    if target_video.exists() and target_video.stat().st_size > 512 * 1024:
                        if not export_win.Exists(maxSearchSeconds=0.5):
                            is_finished = True
                            break

                    if progress_callback and step % 3 == 0:
                        pct_display = min(98, 95 + int((step / 60) * 3))
                        progress_callback(pct_display, "Đang Render", f"[{mode_tag}] CapCut đang render video ({elapsed}s)...")

                time.sleep(1)
                # Close export dialog if still open
                close_btn = export_win.ButtonControl(SubName="Close")
                if not close_btn.Exists(maxSearchSeconds=1):
                    close_btn = export_win.ButtonControl(SubName="Đóng")
                if close_btn.Exists(maxSearchSeconds=1):
                    close_btn.Click()

                return is_finished

    except Exception as e:
        if progress_callback:
            progress_callback(92, "CapCut UI", f"UI controller thông báo: {str(e)[:60]}")

    return False

def run_native_capcut_pro_pipeline(
    project_name: str,
    output_filename: str,
    output_dir: Path,
    ai_engine_mode: str = "CAPCUT_PRO_NATIVE",
    vip_voice: str = "Cô Gái Hoạt Ngôn",
    sync_speed: bool = True,
    account_type: str = "FREE",
    capcut_exe_path: str = None,
    progress_callback = None,
    gemini_key: str = None,
    draft_folder: Path = None
) -> bool:
    """
    Executes the full CapCut Auto Pipeline end-to-end (Virtual User Operator):
    Supports both CapCut Pro (VIP Features 2025/2026) and CapCut Free (Paywall-Free Safe Flow).
    1. Smartly detects if CapCut is already open (Home or Editor) and opens the exact target project
    2. PRO Mode: Runs CapCut Pro Auto Captions + Bilingual Translate + VIP AI Voice
       FREE Mode: Uses pre-injected Whisper/Gemini subtitles & Edge-TTS audio (0 Pro assets)
    3. Automatic Export (Ctrl + E) to Output folder
    """
    is_pro = (str(account_type or "FREE").upper() == "PRO")
    mode_label = "CapCut Pro VIP" if is_pro else "CapCut Thường (Free)"

    # Initialize Floating OSD Banner on top of CapCut window
    osd = CapCutOSD()
    osd.start(f"Khởi động Virtual Operator điều khiển {mode_label}...")

    def osd_progress(pct, stage, msg):
        osd.update(f"[{stage}] {msg}")
        if progress_callback:
            progress_callback(pct, stage, msg)

    try:
        osd_progress(30, "CapCut Pipeline", f"Khởi động điều khiển {mode_label} (Chế độ: {ai_engine_mode})...")

        ensure_capcut_running(capcut_exe_path)
        time.sleep(1.5)

        win = find_capcut_main_window()
        if not win:
            raise RuntimeError(
                "Không tìm thấy phần mềm CapCut PC đang mở trên máy! Vui lòng mở sẵn CapCut PC trước khi bấm AUTO, hoặc chọn chế độ '⚡ FFmpeg Siêu Tốc (Chạy ngầm 100%)' để render trực tiếp."
            )

        enter_project_editor(
            win=win,
            project_name=project_name,
            capcut_exe_path=capcut_exe_path,
            progress_callback=osd_progress
        )

        # 1. Auto Subtitles
        if is_pro and ai_engine_mode == "CAPCUT_PRO_NATIVE":
            trigger_capcut_auto_captions(enable_bilingual=True, progress_callback=osd_progress)
            trigger_capcut_bilingual_translate(progress_callback=osd_progress)
        else:
            osd_progress(50, "Căn Chỉnh Sub", f"[{mode_label}] Phụ đề Tiếng Việt (Free-Safe) đã được tích hợp sẵn vào timeline, bỏ qua Auto Sub trả phí.")

        # 2. Text to Speech Dubbing
        if is_pro and ai_engine_mode in ["CAPCUT_PRO_NATIVE", "HYBRID_PRO"]:
            trigger_capcut_text_to_speech(voice_name=vip_voice, sync_speed=sync_speed, progress_callback=osd_progress)
        else:
            osd_progress(75, "Lồng Tiếng Khớp Âm", f"[{mode_label}] Track giọng đọc AI tự nhiên đã đồng bộ sẵn vào timeline, tránh Paywall VIP.")

        # 3. Export Video via UI
        exported_ok = open_draft_and_export(
            project_name=project_name,
            output_filename=output_filename,
            output_dir=output_dir,
            capcut_exe_path=capcut_exe_path,
            account_type=account_type,
            progress_callback=osd_progress
        )

        if exported_ok:
            osd_progress(100, "Hoàn tất", f"Quy trình {mode_label} hoàn tất thành công: {output_filename}.mp4")
            osd.stop(f"Hoàn tất xuất video: {output_filename}.mp4", delay=2)
            return True
        else:
            osd.stop("Chuyển sang FFmpeg hoàn thiện file xuất...", delay=1)
            return False
    except Exception as e:
        osd.stop(f"Lỗi: {str(e)[:60]}", delay=3)
        raise
