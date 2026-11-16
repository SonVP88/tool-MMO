#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auto-Detect Hard-Sub Bounding Box (OCR & Computer Vision)
Extracts 3-5 sample frames from the video, analyzes the bottom 1/3 area,
detects text regions and returns bounding box coordinates in percentage:
{ "x": float, "y": float, "width": float, "height": float }
"""

import sys
import os
import json
import argparse
import subprocess
from pathlib import Path
from PIL import Image, ImageFilter

def get_ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def extract_sample_frames(video_path: str, temp_dir: Path, num_frames: int = 4) -> list:
    temp_dir.mkdir(parents=True, exist_ok=True)
    ffmpeg = get_ffmpeg_exe()
    frames = []

    # Get sample timestamps at 25%, 40%, 60%, 75%
    for idx, pct in enumerate([0.25, 0.40, 0.60, 0.75]):
        out_frame = temp_dir / f"frame_{idx}.png"
        cmd = [
            ffmpeg, "-y",
            "-ss", f"{pct * 10.0:.2f}",
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",
            str(out_frame)
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if out_frame.exists() and out_frame.stat().st_size > 0:
            frames.append(out_frame)

    return frames

def detect_sub_box_vision(frames: list) -> dict:
    # Try rapidocr first if installed
    try:
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR()
        all_boxes = []
        for f in frames:
            img = Image.open(f)
            w, h = img.size
            # Crop lower 40% (subtitle area)
            sub_crop = img.crop((0, int(h * 0.60), w, h))
            crop_path = f.with_name(f"crop_{f.name}")
            sub_crop.save(crop_path)

            ocr_res, _ = engine(str(crop_path))
            if ocr_res:
                for line in ocr_res:
                    box = line[0] # [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
                    x1 = min(p[0] for p in box)
                    y1 = min(p[1] for p in box) + int(h * 0.60)
                    x2 = max(p[0] for p in box)
                    y2 = max(p[1] for p in box) + int(h * 0.60)
                    all_boxes.append((x1, y1, x2 - x1, y2 - y1, w, h))

        if all_boxes:
            # Average bounding box
            avg_x = sum(b[0] for b in all_boxes) / len(all_boxes)
            avg_y = sum(b[1] for b in all_boxes) / len(all_boxes)
            avg_w = sum(b[2] for b in all_boxes) / len(all_boxes)
            avg_h = sum(b[3] for b in all_boxes) / len(all_boxes)
            w, h = all_boxes[0][4], all_boxes[0][5]

            # Convert to percentage with slight padding for safe blurring
            pad_x = max(10, avg_w * 0.1)
            pad_y = max(6, avg_h * 0.15)
            x_pct = max(0.0, ((avg_x - pad_x) / w) * 100.0)
            y_pct = max(50.0, ((avg_y - pad_y) / h) * 100.0)
            w_pct = min(100.0 - x_pct, ((avg_w + pad_x * 2) / w) * 100.0)
            h_pct = min(100.0 - y_pct, ((avg_h + pad_y * 2) / h) * 100.0)

            return {
                "x": round(x_pct, 1),
                "y": round(y_pct, 1),
                "width": round(w_pct, 1),
                "height": round(h_pct, 1),
                "method": "RapidOCR"
            }
    except Exception:
        pass

    # Computer Vision High-Contrast Subtitle Area Analysis
    if frames:
        try:
            img = Image.open(frames[0]).convert('L')
            w, h = img.size
            # Crop lower 35%
            lower_h_start = int(h * 0.65)
            crop = img.crop((0, lower_h_start, w, h))
            # Edge detection filter
            edges = crop.filter(ImageFilter.FIND_EDGES)
            
            # Analyze horizontal & vertical distribution of high gradient subtitle text
            hist_y = [0] * (h - lower_h_start)
            pixels = edges.load()
            crop_w, crop_h = crop.size

            for cy in range(crop_h):
                row_sum = sum(pixels[cx, cy] for cx in range(0, crop_w, 4))
                hist_y[cy] = row_sum

            # Find peak text rows
            max_val = max(hist_y) if hist_y else 0
            if max_val > 0:
                text_rows = [i for i, v in enumerate(hist_y) if v > max_val * 0.45]
                if text_rows:
                    top_y = min(text_rows) + lower_h_start
                    bottom_y = max(text_rows) + lower_h_start
                    sub_h = max(20, bottom_y - top_y + 12)
                    y_pct = max(55.0, (top_y - 6) / h * 100.0)
                    h_pct = min(25.0, sub_h / h * 100.0)
                    return {
                        "x": 18.0,
                        "y": round(y_pct, 1),
                        "width": 36.0,
                        "height": round(h_pct, 1),
                        "method": "EdgeDetection"
                    }
        except Exception:
            pass

    # Standard optimized default for 16:9 videos
    return {
        "x": 17.5,
        "y": 73.5,
        "width": 35.0,
        "height": 9.0,
        "method": "StandardPreset"
    }

def main():
    parser = argparse.ArgumentParser(description="Auto detect hard subtitle box")
    parser.add_argument("--video", type=str, required=True)
    args = parser.parse_args()

    video_path = args.video
    temp_dir = Path("./temp/ocr_detect").resolve()

    frames = extract_sample_frames(video_path, temp_dir)
    res = detect_sub_box_vision(frames)
    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
