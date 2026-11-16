import React, { useState } from 'react';
import { X, Link2, FolderPlus, Film, Plus } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const AddVideoModal: React.FC = () => {
  const { isAddVideoModalOpen, setAddVideoModalOpen, addBatchTasks, addLog } = useStudioStore();
  const [linksText, setLinksText] = useState('');
  const [activeTab, setActiveTab] = useState<'link' | 'local'>('link');

  if (!isAddVideoModalOpen) return null;

  const handleAddLinks = async () => {
    const lines = linksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      addLog('Vui lòng nhập ít nhất 1 đường link hoặc tên video.', 'warn');
      return;
    }

    await addBatchTasks(lines);
    setLinksText('');
    setAddVideoModalOpen(false);
  };

  const handleMockAddLocal = async () => {
    await addBatchTasks([
      'C:\\Videos\\Douyin\\Episode_22_HD.mp4',
      'C:\\Videos\\Douyin\\Episode_23_HD.mp4'
    ]);
    setAddVideoModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Thêm Video Vào Hàng Đợi Tự Động Hóa</span>
          </div>
          <button
            onClick={() => setAddVideoModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#233145] bg-[#0c1118]">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'link'
                ? 'border-emerald-500 text-emerald-400 bg-[#151c27]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Nhập Link (Douyin / TikTok / YouTube)
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'local'
                ? 'border-emerald-500 text-emerald-400 bg-[#151c27]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            Chọn File Video Có Sẵn
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {activeTab === 'link' ? (
            <>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dán danh sách liên kết video Douyin / Kuaishou / TikTok / Bilibili (mỗi dòng một link). Tool sẽ tự động dùng <code className="text-amber-400">yt-dlp</code> để tải không logo.
              </p>
              <textarea
                rows={6}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                placeholder={`https://v.douyin.com/iRxxxx/\nhttps://v.douyin.com/iRyyyy/\nVideo_22`}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 resize-none"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-[#233145] rounded-xl bg-[#0d131c] gap-3">
              <Film className="w-10 h-10 text-slate-500" />
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-300">
                  Kéo thả video vào đây hoặc chọn từ máy tính
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Hỗ trợ định dạng MP4, MKV, MOV, TS
                </div>
              </div>
              <button
                onClick={handleMockAddLocal}
                className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-bold shadow-md transition-colors"
              >
                Chọn File Video (.mp4)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-end gap-2">
          <button
            onClick={() => setAddVideoModalOpen(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Đóng
          </button>
          {activeTab === 'link' && (
            <button
              onClick={handleAddLinks}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Vào Hàng Đợi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

