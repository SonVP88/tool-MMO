#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CapCut PC Draft Injection Generator
Generates full CapCut PC native draft project structure:
- draft_content.json (4 Tracks: Video, Blur Effect, TTS Audio, Subtitles Text)
- draft_meta_info.json (Project metadata, timestamp, materials list)
Compatible with CapCut PC (Global) & Jianying Pro (China).
"""

import os
import sys
import json
import uuid
import time
import shutil
from pathlib import Path

def generate_id() -> str:
    return str(uuid.uuid4()).upper()

def get_capcut_draft_base_path(custom_path: str = None) -> Path:
    if custom_path and os.path.exists(custom_path):
        return Path(custom_path)
    
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        Path(local_appdata) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft",
        Path(local_appdata) / "JianyingPro" / "User Data" / "Projects" / "com.lveditor.draft",
        Path.home() / "AppData" / "Local" / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft",
    ]
    for c in candidates:
        if c.exists():
            return c
    # Default fallback
    target = Path(local_appdata) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    target.mkdir(parents=True, exist_ok=True)
    return target

def sec_to_us(seconds: float) -> int:
    """Convert seconds to CapCut microseconds (1s = 1,000,000 us)"""
    return int(round(seconds * 1_000_000))

def create_capcut_draft(
    project_name: str,
    raw_video_path: Path,
    tts_audio_segments: list, # [{"start": float, "end": float, "audio_path": Path, "text": str}]
    settings: dict,
    old_sub_box: dict,
    new_sub_box: dict,
    custom_draft_dir: str = None
) -> Path:
    """
    Creates a complete CapCut PC project folder with 4 tracks:
    1. Main Video Track (with original volume setting)
    2. Blur / Mask Layer covering old sub box
    3. TTS Audio Track (mapped to exact timestamps and voice volume)
    4. New Subtitle Text Track (styled text with font size, color, stroke, position)
    """
    base_draft_dir = get_capcut_draft_base_path(custom_draft_dir)
    project_folder_name = f"{project_name}_{int(time.time())}"
    project_dir = base_draft_dir / project_folder_name
    project_dir.mkdir(parents=True, exist_ok=True)

    project_id = generate_id()
    now_us = int(time.time() * 1_000_000)

    # Estimate video duration from TTS or file
    total_duration_sec = 10.0
    if tts_audio_segments:
        total_duration_sec = max(10.0, max([seg.get('end', 0.0) for seg in tts_audio_segments]) + 1.0)
    total_duration_us = sec_to_us(total_duration_sec)

    orig_volume = float(settings.get("originalAudioVolume", 20)) / 100.0
    voice_volume = float(settings.get("voiceVolume", 100)) / 100.0
    font_size = float(settings.get("fontSize", 25))
    text_color = settings.get("textColor", "#f59e0b")
    stroke_color = settings.get("strokeColor", "#000000")

    # Materials container
    materials = {
        "videos": [],
        "audios": [],
        "texts": [],
        "effects": [],
        "speeds": [],
        "canvases": [],
        "sound_channel_mappings": []
    }

    # Tracks container
    tracks = []

    # ==================== 1. TRACK 1: RAW VIDEO ====================
    video_mat_id = generate_id()
    video_speed_id = generate_id()
    materials["speeds"].append({
        "id": video_speed_id,
        "speed": 1.0,
        "curve_speed": None
    })

    materials["videos"].append({
        "id": video_mat_id,
        "path": str(raw_video_path.resolve()),
        "material_name": raw_video_path.name,
        "duration": total_duration_us,
        "width": 1280,
        "height": 720,
        "type": "video",
        "category_id": "",
        "category_name": "local"
    })

    track_video = {
        "id": generate_id(),
        "type": "video",
        "attribute": 0,
        "segments": [
            {
                "id": generate_id(),
                "material_id": video_mat_id,
                "target_timerange": {
                    "start": 0,
                    "duration": total_duration_us
                },
                "source_timerange": {
                    "start": 0,
                    "duration": total_duration_us
                },
                "speed": 1.0,
                "volume": orig_volume,
                "extra_material_refs": [video_speed_id]
            }
        ]
    }
    tracks.append(track_video)

    # ==================== 2. TRACK 2: BLUR OVERLAY (SUB CŨ) ====================
    effect_mat_id = generate_id()
    materials["effects"].append({
        "id": effect_mat_id,
        "name": "Làm mờ chuyển động (Box Blur)",
        "effect_id": "blur_sub_cover",
        "type": "blur",
        "value": float(settings.get("blurRadius", 25)) / 50.0,
        "apply_target_type": 0,
        "adjust_params": [
            {"default_value": 0.5, "name": "intensity", "value": 0.6}
        ]
    })

    # Normalized coordinates in CapCut range (-1.0 to 1.0)
    bx_norm = (float(old_sub_box.get('x', 18)) / 50.0) - 1.0
    by_norm = 1.0 - (float(old_sub_box.get('y', 72)) / 50.0)

    track_effect = {
        "id": generate_id(),
        "type": "effect",
        "attribute": 0,
        "segments": [
            {
                "id": generate_id(),
                "material_id": effect_mat_id,
                "target_timerange": {
                    "start": 0,
                    "duration": total_duration_us
                },
                "render_index": 1000,
                "clip": {
                    "transform_x": bx_norm,
                    "transform_y": by_norm,
                    "scale_x": float(old_sub_box.get('width', 32)) / 100.0,
                    "scale_y": float(old_sub_box.get('height', 9)) / 100.0,
                }
            }
        ]
    }
    tracks.append(track_effect)

    # ==================== 3. TRACK 3: TTS VOICE AUDIOS ====================
    audio_segments = []
    for seg in tts_audio_segments:
        seg_audio_path = Path(seg['audio_path'])
        if not seg_audio_path.exists():
            continue
        audio_mat_id = generate_id()
        audio_speed_id = generate_id()
        materials["speeds"].append({"id": audio_speed_id, "speed": 1.0, "curve_speed": None})

        dur_us = sec_to_us(seg['end'] - seg['start'])
        materials["audios"].append({
            "id": audio_mat_id,
            "path": str(seg_audio_path.resolve()),
            "material_name": seg_audio_path.name,
            "duration": dur_us,
            "type": "voice",
            "category_name": "tts"
        })

        audio_segments.append({
            "id": generate_id(),
            "material_id": audio_mat_id,
            "target_timerange": {
                "start": sec_to_us(seg['start']),
                "duration": dur_us
            },
            "source_timerange": {
                "start": 0,
                "duration": dur_us
            },
            "speed": 1.0,
            "volume": voice_volume,
            "extra_material_refs": [audio_speed_id]
        })

    if audio_segments:
        track_audio = {
            "id": generate_id(),
            "type": "audio",
            "attribute": 0,
            "segments": audio_segments
        }
        tracks.append(track_audio)

    # ==================== 4. TRACK 4: NEW SUBTITLES TEXT ====================
    text_segments = []
    # Convert Y coordinate to CapCut coordinate (-1.0 to 1.0)
    sub_y_percent = float(new_sub_box.get('y', 78))
    capcut_y = 1.0 - (sub_y_percent / 50.0)

    for seg in tts_audio_segments:
        text_content = seg.get('text', '')
        if not text_content:
            continue
        text_mat_id = generate_id()

        materials["texts"].append({
            "id": text_mat_id,
            "content": json.dumps({
                "styles": [
                    {
                        "fill": {"alpha": 1.0, "content": {"solid": {"color": [int(text_color[1:3], 16)/255.0, int(text_color[3:5], 16)/255.0, int(text_color[5:7], 16)/255.0]}}},
                        "font": {"path": "C:/Windows/Fonts/arial.ttf", "id": ""},
                        "size": font_size / 25.0 * 8.0,
                        "strokes": [{"alpha": 1.0, "color": [0.0, 0.0, 0.0], "width": 0.08}]
                    }
                ],
                "text": text_content
            }, ensure_ascii=False),
            "font_size": font_size,
            "text_color": text_color,
            "stroke_color": stroke_color,
            "type": "subtitle",
            "typesetting": 0
        })

        dur_us = sec_to_us(seg['end'] - seg['start'])
        text_segments.append({
            "id": generate_id(),
            "material_id": text_mat_id,
            "target_timerange": {
                "start": sec_to_us(seg['start']),
                "duration": dur_us
            },
            "render_index": 15000,
            "clip": {
                "transform_x": 0.0,
                "transform_y": capcut_y,
                "scale_x": 1.0,
                "scale_y": 1.0,
            }
        })

    if text_segments:
        track_text = {
            "id": generate_id(),
            "type": "text",
            "attribute": 0,
            "segments": text_segments
        }
        tracks.append(track_text)

    # ==================== ASSEMBLE DRAFT_CONTENT.JSON ====================
    draft_content = {
        "id": project_id,
        "fps": 30.0,
        "duration": total_duration_us,
        "canvas_config": {
            "width": 1280,
            "height": 720,
            "ratio": "16:9"
        },
        "materials": materials,
        "tracks": tracks,
        "version": 360000
    }

    # ==================== ASSEMBLE DRAFT_META_INFO.JSON ====================
    draft_meta = {
        "draft_id": project_id,
        "draft_name": project_name,
        "draft_fold_path": str(project_dir.resolve()),
        "draft_root_path": str(base_draft_dir.resolve()),
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "draft_cover": "",
        "draft_materials": [
            {
                "type": 0,
                "value": [str(raw_video_path.resolve())]
            }
        ],
        "draft_timeline_materials_size_": len(materials["videos"]) + len(materials["audios"])
    }

    # Save to disk
    with open(project_dir / "draft_content.json", "w", encoding="utf-8") as f:
        json.dump(draft_content, f, ensure_ascii=False, indent=2)

    with open(project_dir / "draft_meta_info.json", "w", encoding="utf-8") as f:
        json.dump(draft_meta, f, ensure_ascii=False, indent=2)

    return project_dir
