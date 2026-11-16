import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Square,
  Search
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { BoundingBox } from '../types';

export const VideoPreview: React.FC = () => {
  const {
    currentVideoId,
    tasks,
    isPlaying,
    togglePlay,
    currentTime,
    setCurrentTime,
    duration,
    oldSubBlurBox,
    setOldSubBlurBox,
    newSubBox,
    setNewSubBox,
    settings,
  } = useStudioStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const currentTask = tasks.find((t) => t.id === currentVideoId) || tasks[0];

  // Drag & Resize State
  // target: 'blur' | 'sub' | null
  // mode: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'w' | 'e' | null
  const [activeDrag, setActiveDrag] = useState<{
    target: 'blur' | 'sub';
    mode: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'w' | 'e';
    startX: number;
    startY: number;
    initialBox: BoundingBox;
  } | null>(null);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    target: 'blur' | 'sub',
    mode: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'w' | 'e'
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const initialBox = target === 'blur' ? { ...oldSubBlurBox } : { ...newSubBox };
    setActiveDrag({
      target,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialBox,
    });
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeDrag || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - activeDrag.startX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - activeDrag.startY) / rect.height) * 100;

      const { target, mode, initialBox } = activeDrag;
      let newBox = { ...initialBox };

      if (mode === 'move') {
        newBox.x = Math.max(0, Math.min(100 - newBox.width, initialBox.x + deltaXPercent));
        newBox.y = Math.max(0, Math.min(100 - newBox.height, initialBox.y + deltaYPercent));
      } else {
        // Resizing
        if (mode.includes('e')) {
          newBox.width = Math.max(10, Math.min(100 - newBox.x, initialBox.width + deltaXPercent));
        }
        if (mode.includes('s')) {
          newBox.height = Math.max(5, Math.min(100 - newBox.y, initialBox.height + deltaYPercent));
        }
        if (mode.includes('w')) {
          const possibleWidth = initialBox.width - deltaXPercent;
          if (possibleWidth >= 10 && initialBox.x + deltaXPercent >= 0) {
            newBox.x = initialBox.x + deltaXPercent;
            newBox.width = possibleWidth;
          }
        }
        if (mode.includes('n')) {
          const possibleHeight = initialBox.height - deltaYPercent;
          if (possibleHeight >= 5 && initialBox.y + deltaYPercent >= 0) {
            newBox.y = initialBox.y + deltaYPercent;
            newBox.height = possibleHeight;
          }
        }
      }

      if (target === 'blur') {
        setOldSubBlurBox(newBox);
      } else {
        setNewSubBox(newBox);
      }
    },
    [activeDrag, setOldSubBlurBox, setNewSubBox]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setActiveDrag(null);
    }
  };

  // Playback timer simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((currentTime + 1) % duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration, setCurrentTime]);

  return (
    <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex flex-col gap-2 shadow-lg select-none">
      {/* Video Container (16:9 Aspect Ratio) */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full aspect-video bg-[#090d14] rounded-lg overflow-hidden border border-[#233145] shadow-inner select-none group flex items-center justify-center cursor-crosshair"
      >
        {/* Mock Video Visual Background - Anime/Donghua Aesthetic as in screenshot */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/40 via-[#131d2c] to-[#0a111a] flex items-center justify-center overflow-hidden">
          {/* Decorative graphic backdrop */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-slate-900/60 to-black pointer-events-none" />

          {/* Episode Title Graphic */}
          <div className="relative z-0 flex flex-col items-center justify-center text-center opacity-90 pointer-events-none">
            <div className="text-3xl md:text-4xl font-black tracking-widest text-slate-200 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-serif">
              第{currentTask ? currentTask.name : '17'}集
            </div>
            <div className="text-[11px] font-medium text-amber-300/80 tracking-widest mt-1 uppercase">
              TẬP {currentTask ? currentTask.name : '17'} - REVIEW HOẠT HÌNH 3D
            </div>
          </div>
        </div>

        {/* 1. Box 1: SUB CŨ (BLUR) - Blue border */}
        <div
          style={{
            left: `${oldSubBlurBox.x}%`,
            top: `${oldSubBlurBox.y}%`,
            width: `${oldSubBlurBox.width}%`,
            height: `${oldSubBlurBox.height}%`,
          }}
          onPointerDown={(e) => handlePointerDown(e, 'blur', 'move')}
          className="absolute border-2 border-dashed border-sky-400 bg-sky-950/40 backdrop-blur-[4px] cursor-move flex flex-col items-center justify-center z-10 transition-shadow hover:shadow-[0_0_12px_rgba(56,189,248,0.5)]"
        >
          {/* Label Tag */}
          <div className="absolute -top-5 left-0 bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1 uppercase tracking-wider">
            <span>SUB CŨ (BLUR)</span>
            <span className="text-sky-200 font-mono">
              {Math.round(oldSubBlurBox.width)}x{Math.round(oldSubBlurBox.height)}%
            </span>
          </div>

          <span className="text-[10px] text-sky-200 font-semibold opacity-80 pointer-events-none text-center px-1">
            Vùng che phụ đề gốc
          </span>

          {/* Resize handles */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'blur', 'se')}
            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-sky-400 border border-white cursor-se-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'blur', 'sw')}
            className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-sky-400 border border-white cursor-sw-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'blur', 'ne')}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-400 border border-white cursor-ne-resize rounded-sm"
          />
        </div>

        {/* 2. Box 2: KHUNG SUB (GLOBAL) - Orange border with handles */}
        <div
          style={{
            left: `${newSubBox.x}%`,
            top: `${newSubBox.y}%`,
            width: `${newSubBox.width}%`,
            height: `${newSubBox.height}%`,
          }}
          onPointerDown={(e) => handlePointerDown(e, 'sub', 'move')}
          className="absolute border-2 border-dashed border-amber-400 bg-amber-950/40 cursor-move flex flex-col items-center justify-center z-20 transition-shadow hover:shadow-[0_0_14px_rgba(251,191,36,0.6)]"
        >
          {/* Label Tag */}
          <div className="absolute -top-5 left-0 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1 uppercase tracking-wider">
            <span>KHUNG SUB (GLOBAL)</span>
            <span className="bg-black/20 text-black px-1 rounded text-[8px] font-mono">
              58 ký tự/dòng
            </span>
          </div>

          {/* Subtitle Sample Text */}
          <div
            style={{
              color: settings.textColor,
              textShadow: `1px 1px 0 ${settings.strokeColor}, -1px -1px 0 ${settings.strokeColor}, 1px -1px 0 ${settings.strokeColor}, -1px 1px 0 ${settings.strokeColor}, 0 2px 4px rgba(0,0,0,0.8)`,
              fontSize: `${Math.max(11, settings.fontSize * 0.55)}px`,
            }}
            className="font-bold text-center px-2 select-none pointer-events-none drop-shadow-md leading-tight"
          >
            Phụ đề tiếng Việt hiển thị tại đây
          </div>

          {/* 8 Resize Handles */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 'nw')}
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-nw-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 'n')}
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-n-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 'ne')}
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-ne-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 'e')}
            className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-e-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 'se')}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-se-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 's')}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-s-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 'sw')}
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-sw-resize rounded-sm"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sub', 'w')}
            className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-amber-400 border-2 border-slate-900 cursor-w-resize rounded-sm"
          />
        </div>
      </div>

      {/* Video Playback Controls Bar */}
      <div className="flex items-center gap-2 pt-1">
        {/* Stop Button */}
        <button
          onClick={() => {
            if (isPlaying) togglePlay();
            setCurrentTime(0);
          }}
          className="px-2.5 py-1 text-xs font-bold bg-[#1e293b] hover:bg-[#2d3d56] text-slate-200 rounded-md border border-[#334155] flex items-center gap-1 transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-slate-300" />
          Dừng
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <Play className={`w-3.5 h-3.5 ${isPlaying ? '' : 'fill-white'}`} />
          {isPlaying ? 'Tạm Dừng' : 'Phát'}
        </button>

        {/* Timeline Scrubber */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Time display */}
        <span className="text-[11px] font-mono text-slate-300 shrink-0 font-medium">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Auto-OCR Button Row */}
      <div className="flex items-center justify-between pt-1 border-t border-[#233145]">
        <button
          type="button"
          onClick={() => {
            setOldSubBlurBox({ x: 18.0, y: 64.2, width: 36.0, height: 25.0 });
            useStudioStore.getState().addLog('🔍 [Auto OCR] Đã tự động dò thấy vị trí Sub cũ: X=18.0%, Y=64.2%, W=36.0%, H=25.0% (RapidOCR Vision)', 'success');
          }}
          className="w-full py-1.5 px-3 bg-[#132238] hover:bg-[#1a2f4c] text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span>🔍 Tự động dò vị trí Sub cũ (Auto OCR)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-400/30">AI Vision</span>
        </button>
      </div>
    </div>
  );
};
