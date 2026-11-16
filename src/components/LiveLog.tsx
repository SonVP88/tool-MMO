import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const LiveLog: React.FC = () => {
  const { logs, addLog } = useStudioStore();
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-emerald-400';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400 font-semibold';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="bg-[#111722] border border-[#202c3e] rounded-xl flex flex-col h-32 shrink-0 overflow-hidden shadow-inner select-none font-mono">
      {/* Title bar */}
      <div className="bg-[#0b1018] px-3 py-1 border-b border-[#1c2738] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>THỰC THI THỜI GIAN THỰC (LIVE LOG)</span>
        </div>
        <button
          onClick={() => addLog('Đã dọn dẹp bộ nhớ đệm log.', 'info')}
          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
          title="Xóa log"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Terminal Content */}
      <div
        ref={logContainerRef}
        className="flex-1 p-2 overflow-y-auto space-y-1 text-[11px] leading-relaxed select-text"
      >
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2">
            <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
            <span className={`break-all ${getLogColor(log.type)}`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
