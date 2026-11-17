import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  PlusCircle, 
  RotateCw, 
  KeyRound, 
  FolderOpen, 
  FileText,
  Clock,
  Trash2,
  CheckCircle,
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const ControlPanel: React.FC = () => {
  const {
    isRunning,
    isPaused,
    toggleRun,
    pauseRun,
    stopRun,
    retryErrors,
    retrySelected,
    deleteSelected,
    deleteWaiting,
    cleanDone,
    globalProgress,
    setAddVideoModalOpen,
    setCookieModalOpen,
    setTranslationConfigOpen,
    geminiApiKey,
    addLog,
    openFolder,
    outputDir,
  } = useStudioStore();

  const handleOpenExportFolder = () => {
    openFolder(outputDir);
  };

  const handleViewLog = () => {
    addLog('Mở cửa sổ nhật ký chi tiết hệ thống...', 'info');
  };

  return (
    <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3.5 flex flex-col gap-3 shadow-lg select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Quy Trình Tự Động Hóa Reup Toàn Diện
          </span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
          Chế độ đa luồng
        </span>
      </div>

      {/* Missing API Key Warning Banner */}
      {!geminiApiKey && (
        <div 
          onClick={() => setTranslationConfigOpen(true)}
          className="bg-amber-500/15 border-2 border-amber-500/70 hover:bg-amber-500/25 transition-all rounded-xl p-3 flex items-center justify-between cursor-pointer shadow-lg animate-pulse"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                ⚠️ BẠN CHƯA NHẬP GEMINI API KEY ĐỂ DỊCH THUẬT!
              </span>
              <span className="text-[11px] text-slate-300">
                AI cần API Key để nhận diện giọng nói và dịch chuẩn video thật. Bấm vào đây để nhập ngay (Miễn phí 100%).
              </span>
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs rounded-lg shadow-md shrink-0 cursor-pointer"
          >
            👉 NHẬP KEY NGAY
          </button>
        </div>
      )}

      {/* Row 1: Primary Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={toggleRun}
          className={`col-span-1 py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md ${
            isRunning
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-900/40 ring-1 ring-emerald-300'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <Play className="w-4 h-4 fill-white" />
          ▶ AUTO - TỰ ĐỘNG CHẠY
        </button>

        <button
          onClick={() => setAddVideoModalOpen(true)}
          className="col-span-1 py-2.5 px-3 rounded-lg text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white flex items-center justify-center gap-1.5 transition-all shadow-md"
        >
          <PlusCircle className="w-4 h-4" />
          + Thêm Link / Video
        </button>

        <button
          onClick={pauseRun}
          className={`col-span-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
            isPaused
              ? 'bg-amber-600 hover:bg-amber-500 text-white ring-1 ring-amber-300'
              : 'bg-[#1e2a3c] hover:bg-[#283850] text-slate-200 border border-[#2d3e58]'
          }`}
        >
          <Pause className="w-4 h-4" />
          {isPaused ? '▶ Tiếp Tục' : '⏸ Tạm Dừng'}
        </button>

        <button
          onClick={stopRun}
          className="col-span-1 py-2.5 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md"
        >
          <Square className="w-4 h-4 fill-white" />
          ⏹ Hủy
        </button>
      </div>

      {/* Row 2: Secondary Tool Buttons */}
      <div className="grid grid-cols-5 gap-2">
        <button
          onClick={retryErrors}
          className="py-1.5 px-2 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          <RotateCw className="w-3.5 h-3.5" />
          ⟳ Thử lại lỗi
        </button>

        <button
          onClick={() => setTranslationConfigOpen(true)}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            geminiApiKey
              ? 'bg-[#152e25] text-emerald-300 border border-emerald-500/40 hover:bg-[#1a382d]'
              : 'bg-amber-500 text-black hover:bg-amber-400 animate-bounce font-black'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {geminiApiKey ? '🔑 API Dịch (Đã có)' : '🔑 NHẬP API KEY'}
        </button>

        <button
          onClick={() => setCookieModalOpen(true)}
          className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-[#112a3d] hover:bg-[#15364e] text-cyan-300 border border-[#1e4a6d] flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
          ⚙ Cookie Douyin
        </button>

        <button
          onClick={handleOpenExportFolder}
          className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-[#1b2535] hover:bg-[#243349] text-slate-200 border border-[#2b3a50] flex items-center justify-center gap-1.5 transition-all shadow-sm"
          title={`Mở thư mục: ${outputDir || 'C:\\Output'}`}
        >
          <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
          📁 Mở Thư Mục
        </button>

        <button
          onClick={handleViewLog}
          className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-[#1e233d] hover:bg-[#282f50] text-indigo-200 border border-[#303960] flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          📄 Xem Nhật Ký
        </button>
      </div>

      {/* Global Progress Bar */}
      <div className="bg-[#0f141c] p-2.5 rounded-lg border border-[#222e40] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Hàng đợi:{' '}
              <strong className="text-white">
                {globalProgress.processed}/{globalProgress.total} Video
              </strong>{' '}
              ({globalProgress.percent.toFixed(1)}%) • Dự kiến còn lại:{' '}
              <span className="text-emerald-400 font-mono font-bold">
                {globalProgress.estimatedTime}
              </span>
            </span>
          </div>
          <span className="text-emerald-400 font-mono font-black text-xs">
            {globalProgress.percent}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2.5 bg-[#1b2535] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 relative shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${globalProgress.percent}%` }}
          />
        </div>
      </div>

      {/* Row 3: Batch Operations on Queue */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={retryErrors}
          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#2a1c17] hover:bg-[#3a261f] text-orange-400 border border-orange-500/30 flex items-center gap-1 transition-colors"
        >
          <RefreshCcw className="w-3 h-3" />
          Chạy Lại Mục Lỗi
        </button>

        <button
          onClick={retrySelected}
          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#132238] hover:bg-[#1a2d48] text-sky-400 border border-sky-500/30 flex items-center gap-1 transition-colors"
        >
          <RefreshCcw className="w-3 h-3" />
          Chạy Lại Mục Đã Chọn
        </button>

        <button
          onClick={deleteSelected}
          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#2e171a] hover:bg-[#3d1e22] text-rose-400 border border-rose-500/30 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Xóa Mục Chọn
        </button>

        <button
          onClick={deleteWaiting}
          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#2c2214] hover:bg-[#3d301b] text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Xóa Mục Chờ
        </button>

        <button
          onClick={cleanDone}
          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#132820] hover:bg-[#1b382d] text-emerald-400 border border-emerald-500/30 flex items-center gap-1 transition-colors"
        >
          <CheckCircle className="w-3 h-3" />
          Dọn Mục Đã Xong
        </button>
      </div>
    </div>
  );
};

