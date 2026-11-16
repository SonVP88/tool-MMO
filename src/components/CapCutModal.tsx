import React, { useState } from 'react';
import { X, Video, Folder, Check, Sparkles } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const CapCutModal: React.FC = () => {
  const { 
    isCapCutConfigOpen, 
    setCapCutConfigOpen, 
    settings, 
    updateSettings, 
    addLog 
  } = useStudioStore();

  const [draftDir, setDraftDir] = useState(
    settings.capcutDraftDir || '%LOCALAPPDATA%\\CapCut\\User Data\\Projects\\com.lveditor.draft'
  );
  const [exePath, setExePath] = useState(
    settings.capcutExePath || '%LOCALAPPDATA%\\CapCut\\Apps\\CapCut.exe'
  );

  if (!isCapCutConfigOpen) return null;

  const handleSave = () => {
    updateSettings({
      capcutDraftDir: draftDir,
      capcutExePath: exePath,
    });
    addLog('Đã lưu đường dẫn cấu hình CapCut PC thành công.', 'success');
    setCapCutConfigOpen(false);
  };

  const handleAutoDetect = () => {
    const defaultDraft = '%LOCALAPPDATA%\\CapCut\\User Data\\Projects\\com.lveditor.draft';
    const defaultExe = '%LOCALAPPDATA%\\CapCut\\Apps\\CapCut.exe';
    setDraftDir(defaultDraft);
    setExePath(defaultExe);
    addLog('Đã nạp đường dẫn mặc định CapCut PC trên Windows.', 'info');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Video className="w-4 h-4 text-emerald-400" />
            <span>Cấu Hình Tự Động Hóa CapCut PC (Draft & UI Export)</span>
          </div>
          <button
            onClick={() => setCapCutConfigOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3.5">
          <div className="bg-[#0b1522] border border-[#1b314d] rounded-xl p-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              Hệ thống sẽ tự động tạo thư mục project và bơm trực tiếp 4 Tracks (Video, Lớp phủ làm mờ sub cũ, Giọng đọc TTS, và Phụ đề mới) vào CapCut PC mà không cần thao tác tay.
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                Thư mục Drafts CapCut (com.lveditor.draft):
              </label>
              <button
                type="button"
                onClick={handleAutoDetect}
                className="text-[10px] text-emerald-400 hover:underline"
              >
                Tự động nhận diện
              </button>
            </div>
            <input
              type="text"
              value={draftDir}
              onChange={(e) => setDraftDir(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              placeholder="%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <Video className="w-3.5 h-3.5 text-sky-400" />
              Đường dẫn tệp thực thi CapCut.exe:
            </label>
            <input
              type="text"
              value={exePath}
              onChange={(e) => setExePath(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              placeholder="%LOCALAPPDATA%\CapCut\Apps\CapCut.exe"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-end gap-2">
          <button
            onClick={() => setCapCutConfigOpen(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Lưu Cấu Hình CapCut
          </button>
        </div>
      </div>
    </div>
  );
};

