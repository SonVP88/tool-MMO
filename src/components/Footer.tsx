import React from 'react';
import { Activity, ShieldCheck, Cpu, Wrench, HardDrive } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Footer: React.FC = () => {
  const { globalProgress, isRunning, setDependencyDoctorOpen } = useStudioStore();

  return (
    <footer className="bg-[#0b1017] border-t border-[#1e2a3c] px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0">
      {/* Left indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-mono">
          <Activity className={`w-3.5 h-3.5 ${isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span>
            {isRunning ? (
              <span className="text-emerald-400">
                Đang xử lý hàng đợi {globalProgress.processed}/{globalProgress.total} ({globalProgress.percent}%)
              </span>
            ) : (
              <span>Hàng đợi đang dừng</span>
            )}
          </span>
        </div>

        <div className="h-3 w-[1px] bg-slate-700" />

        <div className="flex items-center gap-1.5 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-sky-300 font-medium">GPU: NVIDIA NVENC / CPU Mode (Tự động)</span>
        </div>

        <div className="h-3 w-[1px] bg-slate-700" />

        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
          <HardDrive className="w-3 h-3 text-slate-500" />
          <span>RAM: 146 MB</span>
          <span>•</span>
          <span>CPU: 3.8%</span>
        </div>
      </div>

      {/* Right Indicator */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setDependencyDoctorOpen(true)}
          className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded font-medium transition-colors"
        >
          <Wrench className="w-3 h-3 text-sky-400" />
          <span>Bác Sĩ Hệ Thống (bin/)</span>
        </button>

        <span className="text-slate-600">•</span>

        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Máy chủ đã kết nối
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Bản quyền Pro
        </span>
        <span className="text-slate-600">•</span>
        <span className="font-mono text-slate-400">Version 2.2.1</span>
      </div>
    </footer>
  );
};

