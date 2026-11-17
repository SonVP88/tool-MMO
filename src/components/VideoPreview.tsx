import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Square,
  Search,
  Film
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { apiDetectSub } from '../services/tauriBridge';
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentTask = tasks.find((t) => t.id === currentVideoId) || tasks[0];
  const targetVideoPath = currentTask?.outputPath && currentTask?.status === 'DONE' 
    ? currentTask.outputPath 
    : (currentTask?.source || '');

  const videoSrc = targetVideoPath 
    ? `http://127.0.0.1:5678/api/video_stream?path=${encodeURIComponent(targetVideoPath)}` 
    : 'http://127.0.0.1:5678/api/video_stream';

  // Drag & Resize State
  const [activeDrag, setActiveDrag] = useState<{
    target: 'blur' | 'sub';
    mode: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'w' | 'e';
    startX: number;
    startY: number;
    initialBox: BoundingBox;
  } | null>(null);

  // Sync play/pause with real HTML5 video
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(Math.floor(videoRef.current.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      const dur = Math.floor(videoRef.current.duration);
      if (!isNaN(dur) && dur > 0) {
        useStudioStore.setState({ duration: dur });
      }
    }
  };

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
        if (mode.includes('e')) {
          newBox.width = Math.max(8, Math.min(100 - newBox.x, initialBox.width + deltaXPercent));
        }
        if (mode.includes('s')) {
          newBox.height = Math.max(4, Math.min(100 - newBox.y, initialBox.height + deltaYPercent));
        }
        if (mode.includes('w')) {
          const possibleWidth = initialBox.width - deltaXPercent;
          if (possibleWidth >= 8 && initialBox.x + deltaXPercent >= 0) {
            newBox.x = initialBox.x + deltaXPercent;
            newBox.width = possibleWidth;
          }
        }
        if (mode.includes('n')) {
          const possibleHeight = initialBox.height - deltaYPercent;
          if (possibleHeight >= 4 && initialBox.y + deltaYPercent >= 0) {
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (isPlaying) togglePlay();
    setCurrentTime(0);
  };

  return (
    <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex flex-col gap-2 shadow-lg select-none">
      {/* Video Container (16:9 Aspect Ratio) */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full aspect-video bg-[#090d14] rounded-lg overflow-hidden border border-[#233145] shadow-inner select-none group flex items-center justify-center cursor-crosshair"
      >
        {/* Real HTML5 Video Player */}
        <video
          ref={videoRef}
          key={videoSrc}
          src={videoSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => { if (isPlaying) togglePlay(); }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none bg-black"
          playsInline
        />

        {/* Fallback Graphic if no video available */}
        {!targetVideoPath && (
          <div className="absolute inset-0 bg-[#0c121c] flex flex-col items-center justify-center text-slate-500 gap-2 pointer-events-none">
            <Film className="w-10 h-10 text-slate-600" />
            <div className="text-xs font-semibold text-slate-400">
              Chưa có video được chọn
            </div>
            <div className="text-[11px] text-slate-600">
              Chọn video từ bảng danh sách bên trái hoặc bấm + Thêm Video
            </div>
          </div>
        )}

        {/* Video Info Tag Top-Right */}
        {currentTask && (
          <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-xs border border-white/10 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono z-30 pointer-events-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="truncate max-w-[140px]">{currentTask.name}</span>
          </div>
        )}

        {/* 1. Box 1: SUB CŨ (BLUR) - Blue border */}
        <div
          style={{
            left: `${oldSubBlurBox.x}%`,
            top: `${oldSubBlurBox.y}%`,
            width: `${oldSubBlurBox.width}%`,
            height: `${oldSubBlurBox.height}%`,
          }}
          onPointerDown={(e) => handlePointerDown(e, 'blur', 'move')}
          className="absolute border-2 border-dashed border-sky-400 bg-sky-950/40 backdrop-blur-[6px] cursor-move flex flex-col items-center justify-center z-10 transition-shadow hover:shadow-[0_0_12px_rgba(56,189,248,0.5)]"
        >
          {/* Label Tag */}
          <div className="absolute -top-5 left-0 bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1 uppercase tracking-wider">
            <span>SUB CŨ (BLUR)</span>
            <span className="text-sky-200 font-mono">
              {Math.round(oldSubBlurBox.width)}x{Math.round(oldSubBlurBox.height)}%
            </span>
          </div>

          <span className="text-[10px] text-sky-200 font-semibold opacity-90 pointer-events-none text-center px-1">
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
              {Math.round(newSubBox.width)}%
            </span>
          </div>

          {/* Subtitle Sample Text with User Styling */}
          <div
            style={{
              color: settings.textColor || '#f59e0b',
              fontSize: `${Math.max(10, Math.min(22, (settings.fontSize || 25) * 0.45))}px`,
              textShadow: `1px 1px 2px ${settings.strokeColor || '#000'}, -1px -1px 2px ${settings.strokeColor || '#000'}, 1px -1px 2px ${settings.strokeColor || '#000'}, -1px 1px 2px ${settings.strokeColor || '#000'}`,
            }}
            className="font-bold pointer-events-none text-center px-2 leading-tight select-none"
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
          onClick={handleStop}
          className="px-2.5 py-1 text-xs font-bold bg-[#1e293b] hover:bg-[#2d3d56] text-slate-200 rounded-md border border-[#334155] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 fill-slate-300" />
          Dừng
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
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
            max={Math.max(1, duration)}
            value={currentTime}
            onChange={handleSeek}
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
          onClick={async () => {
            const currentTask = tasks.find((t) => t.id === currentVideoId) || tasks[0];
            const targetPath = currentTask?.source || currentTask?.outputPath || '';
            useStudioStore.getState().addLog('🔍 Đang trích xuất frame từ video thật và dò vị trí sub cũ (RapidOCR & EdgeDetection)...', 'info');
            const detected = await apiDetectSub(targetPath);
            if (detected && detected.width && detected.height) {
              setOldSubBlurBox({ x: detected.x, y: detected.y, width: detected.width, height: detected.height });
              useStudioStore.getState().addLog(`🔍 [Auto OCR] Tọa độ tìm thấy: X=${detected.x}%, Y=${detected.y}%, W=${detected.width}%, H=${detected.height}% (${(detected as any)?.method || 'Vision'})`, 'success');
            } else {
              setOldSubBlurBox({ x: 18.0, y: 64.2, width: 36.0, height: 25.0 });
              useStudioStore.getState().addLog('🔍 [Auto OCR] Áp dụng tọa độ vùng chữ chuẩn: X=18.0%, Y=64.2%, W=36.0%, H=25.0%', 'info');
            }
          }}
          className="w-full py-1.5 px-3 bg-[#132238] hover:bg-[#1a2f4c] text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span>🔍 Tự động dò vị trí Sub cũ (Auto OCR)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-400/30">AI Vision</span>
        </button>
      </div>
    </div>
  );
};
