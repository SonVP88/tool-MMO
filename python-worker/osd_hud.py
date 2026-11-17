#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Floating On-Screen Display (OSD) HUD Banner
Displays real-time automation progress on top of CapCut PC window
"""
import sys
import os
import json
import time
import tkinter as tk

def main():
    status_file = sys.argv[1] if len(sys.argv) > 1 else "temp/osd_status.json"
    
    root = tk.Tk()
    root.overrideredirect(True)
    root.attributes("-topmost", True)
    
    screen_w = root.winfo_screenwidth()
    w, h = 640, 58
    x = (screen_w - w) // 2
    y = 20
    root.geometry(f"{w}x{h}+{x}+{y}")
    root.configure(bg="#0b111e")
    
    # Outer border container
    frame = tk.Frame(root, bg="#0b111e", highlightbackground="#06b6d4", highlightthickness=2)
    frame.pack(fill="both", expand=True, padx=0, pady=0)
    
    # Top title
    header = tk.Label(
        frame,
        text="🤖 TIỆM BÚN MMO - ĐANG TỰ ĐỘNG THAO TÁC TRÊN CAPCUT PC",
        fg="#38bdf8",
        bg="#0b111e",
        font=("Segoe UI", 9, "bold")
    )
    header.pack(pady=(4, 0))
    
    # Dynamic status message
    msg_label = tk.Label(
        frame,
        text="Đang kết nối giao diện CapCut...",
        fg="#f8fafc",
        bg="#0b111e",
        font=("Segoe UI", 11, "bold"),
        wraplength=620,
        justify="center"
    )
    msg_label.pack(pady=(1, 4))
    
    last_text = ""
    
    def check_file():
        nonlocal last_text
        try:
            if os.path.exists(status_file):
                with open(status_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                if not data.get("active", True):
                    root.destroy()
                    return
                
                cur_text = data.get("message", "")
                if cur_text and cur_text != last_text:
                    last_text = cur_text
                    msg_label.config(text=cur_text)
                    
                    # Highlight border on final/error
                    if "Hoàn tất" in cur_text or "thành công" in cur_text:
                        frame.config(highlightbackground="#10b981") # Green
                    elif "Lỗi" in cur_text:
                        frame.config(highlightbackground="#ef4444") # Red
        except Exception:
            pass
            
        root.after(150, check_file)
        
    root.after(100, check_file)
    root.mainloop()

if __name__ == "__main__":
    main()
