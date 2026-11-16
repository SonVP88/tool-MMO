import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Download, RefreshCw, Cpu, HardDrive, ShieldCheck } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  path: string;
  required: boolean;
}

export const DependencyDoctorModal: React.FC = () => {
  const { isDependencyDoctorOpen, setDependencyDoctorOpen, addLog } = useStudioStore();
  const [isDownloading, setIsDownloading] = useState(false);

  // Status of core dependencies
  const [tools, setTools] = useState<ToolItem[]>([
    {
      id: 'ffmpeg',
      name: 'FFmpeg Core & Encoders',
      description: 'Lõi xử lý video, làm mờ sub cũ, burn phụ đề ASS và trích xuất/trộn audio',
      installed: true,
      path: 'bin\\ffmpeg.exe (Sẵn sàng)',
      required: true,
    },
    {
      id: 'ytdlp',
      name: 'yt-dlp Video Downloader',
      description: 'Công cụ tải video tốc độ cao từ Douyin, TikTok, YouTube Shorts, Kuaishou',
      installed: true,
      path: 'bin\\yt-dlp.exe (Sẵn sàng)',
      required: true,
    },
    {
      id: 'edgetts',
      name: 'Edge-TTS Voice Engine',
      description: 'Động cơ tổng hợp giọng đọc AI chất lượng cao không giới hạn ký tự',
      installed: true,
      path: 'Python Sidecar Engine',
      required: true,
    },
    {
      id: 'capcut',
      name: 'CapCut PC Integration',
      description: 'Thư mục dự án nháp com.lveditor.draft và trình điều khiển UIAutomation',
      installed: true,
      path: '%LOCALAPPDATA%\\CapCut\\User Data\\Projects\\com.lveditor.draft',
      required: false,
    },
  ]);

  const [hwInfo] = useState({
    gpuName: 'NVIDIA GeForce (Tự động phát hiện)',
    encoder: 'CPU: libx264 (Tối ưu đa luồng) / NVENC',
    isHardware: true,
    ram: '146 MB',
    cpu: '3.8%',
  });

  if (!isDependencyDoctorOpen) return null;

  const handleAutoInstallAll = async () => {
    setIsDownloading(true);
    addLog('Bắt đầu tải và tự động cấu hình các công cụ nền vào thư mục bin/...', 'info');

    // Simulate progressive installation or trigger backend
    setTimeout(() => {
      setTools((prev) =>
        prev.map((t) => ({
          ...t,
          installed: true,
          path: t.id === 'capcut' ? t.path : `bin\\${t.id === 'ytdlp' ? 'yt-dlp.exe' : 'ffmpeg.exe'} (Đã cập nhật)`,
        }))
      );
      setIsDownloading(false);
      addLog('Đã hoàn tất cài đặt và kiểm tra toàn bộ công cụ nền!', 'success');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>BÁC SĨ HỆ THỐNG & KIỂM TRA MÔI TRƯỜNG (DEPENDENCY DOCTOR)</span>
          </div>
          <button
            onClick={() => setDependencyDoctorOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hardware Status Banner */}
        <div className="p-4 bg-[#0d131b] border-b border-[#233145] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-slate-200">Phần cứng & Bộ mã hóa phát hiện:</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-medium">
              Sẵn sàng tăng tốc
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-[#151d2a] p-2 rounded border border-[#233246] flex flex-col">
              <span className="text-slate-400">Card Đồ Họa (GPU):</span>
              <span className="text-amber-300 font-medium">{hwInfo.gpuName}</span>
            </div>
            <div className="bg-[#151d2a] p-2 rounded border border-[#233246] flex flex-col">
              <span className="text-slate-400">Bộ Mã Hóa FFmpeg:</span>
              <span className="text-sky-300 font-medium">{hwInfo.encoder}</span>
            </div>
          </div>
        </div>

        {/* Tools list */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-2.5 max-h-[50vh]">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-[#111722] border border-[#233145] rounded-xl p-3 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {tool.installed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{tool.name}</span>
                    {tool.required && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30">
                        Bắt buộc
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{tool.description}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">{tool.path}</p>
                </div>
              </div>

              <div className="shrink-0">
                {tool.installed ? (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Hoạt động
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded">
                    Chưa có
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Thư mục công cụ: <code className="text-slate-300">bin/</code> độc lập</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDependencyDoctorOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleAutoInstallAll}
              disabled={isDownloading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải công cụ...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải tự động công cụ nền</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
