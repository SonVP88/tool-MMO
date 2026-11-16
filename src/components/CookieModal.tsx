import React, { useState } from 'react';
import { X, KeyRound, Check, ShieldCheck } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const CookieModal: React.FC = () => {
  const { isCookieModalOpen, setCookieModalOpen, addLog } = useStudioStore();
  const [cookieValue, setCookieValue] = useState(
    'odin_tt=1a2b3c...; sessionid_ss=8f9a0...; passport_csrf_token=...'
  );

  if (!isCookieModalOpen) return null;

  const handleSaveCookie = () => {
    addLog('Đã lưu cấu hình Cookie Douyin thành công.', 'success');
    setCookieModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Cấu Hình Cookie Douyin (Vượt chặn tải hàng loạt)</span>
          </div>
          <button
            onClick={() => setCookieModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          <div className="bg-[#0b1522] border border-[#1b314d] rounded-xl p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              Dán chuỗi Cookie từ trình duyệt sau khi đăng nhập Douyin.com để tool cào video chất lượng cao (1080p 60fps không watermark) mà không bị checkpoint.
            </div>
          </div>

          <label className="text-xs font-semibold text-slate-300">Chuỗi Cookie (Raw String hoặc Netscape):</label>
          <textarea
            rows={5}
            value={cookieValue}
            onChange={(e) => setCookieValue(e.target.value)}
            className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 resize-none"
            placeholder="Dán cookie tại đây..."
          />
        </div>

        {/* Footer */}
        <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-end gap-2">
          <button
            onClick={() => setCookieModalOpen(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveCookie}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Lưu Cookie
          </button>
        </div>
      </div>
    </div>
  );
};
