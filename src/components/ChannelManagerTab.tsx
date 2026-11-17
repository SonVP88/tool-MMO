import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Plus, 
  FolderOpen, 
  Trash2, 
  CheckCircle2,
  X
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { ChannelItem } from '../types';

export const ChannelManagerTab: React.FC = () => {
  const { openFolder, addLog, outputDir } = useStudioStore();

  const [channels, setChannels] = useState<ChannelItem[]>(() => {
    try {
      const saved = localStorage.getItem('studio_channels');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState<'TikTok' | 'YouTube' | 'Facebook'>('TikTok');
  const [newProfile, setNewProfile] = useState('Mặc định');

  useEffect(() => {
    try {
      localStorage.setItem('studio_channels', JSON.stringify(channels));
    } catch {}
  }, [channels]);

  const handleAddChannel = () => {
    if (!newName.trim()) return;
    const baseOutput = outputDir || 'C:\\Output';
    const item: ChannelItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      platform: newPlatform,
      profile: newProfile,
      outputFolder: `${baseOutput}\\${newPlatform}_${newName.trim().replace(/\s+/g, '_')}`,
      watermark: `logo_${newPlatform.toLowerCase()}.png`,
      totalVideos: 0,
      status: 'ACTIVE',
    };
    setChannels([...channels, item]);
    setNewName('');
    setIsAddOpen(false);
    addLog(`Đã liên kết kênh mới: "${item.name}" [${item.platform}]`, 'success');
  };

  const handleDelete = (id: string) => {
    setChannels(channels.filter((c) => c.id !== id));
    addLog('Đã gỡ bỏ kênh khỏi danh sách quản lý.', 'warn');
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-y-auto select-none bg-[#0f141c]">
      {/* Header Toolbar */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <Tv className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
              QUẢN LÝ KÊNH PHÂN PHỐI & LIÊN KẾT CẤU HÌNH (CHANNEL PRESETS)
            </h2>
            <p className="text-[11px] text-slate-400">
              Mỗi kênh gắn liền với 1 Profile cài đặt, thư mục xuất riêng và logo bản quyền độc lập
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-950/40 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Thêm Kênh Mới
        </button>
      </div>

      {/* Main Content Grid */}
      {channels.length === 0 ? (
        <div className="flex-1 bg-[#151c27] border border-[#253246] rounded-xl flex flex-col items-center justify-center p-8 text-slate-500 gap-3 shadow-lg">
          <Tv className="w-12 h-12 text-slate-600 mb-1" />
          <span className="text-sm font-bold text-slate-300">Chưa có kênh nào được liên kết</span>
          <span className="text-xs text-slate-500 max-w-md text-center">
            Bấm nút <strong className="text-sky-400">+ Thêm Kênh Mới</strong> ở góc trên bên phải để quản lý thư mục xuất riêng biệt và profile cấu hình cho từng kênh TikTok, YouTube hoặc Facebook.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="bg-[#151c27] border border-[#253246] hover:border-slate-600 transition-all rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      ch.platform === 'TikTok'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : ch.platform === 'YouTube'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {ch.platform}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đang hoạt động
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-100 mb-1">{ch.name}</h3>

                <div className="text-[11px] space-y-1 text-slate-400 mt-2">
                  <div>
                    <span className="text-slate-500">Profile liên kết:</span>{' '}
                    <span className="font-semibold text-sky-400">{ch.profile}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500">Thư mục xuất:</span>{' '}
                    <span className="font-mono text-slate-300">{ch.outputFolder}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#233145]">
                <button
                  onClick={() => openFolder(ch.outputFolder)}
                  className="px-2.5 py-1 text-xs bg-[#1f2a3a] hover:bg-[#2a3a50] text-slate-300 rounded border border-[#2f3f56] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  Mở Thư Mục
                </button>

                <button
                  onClick={() => handleDelete(ch.id)}
                  title="Xóa kênh này"
                  className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Channel */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
              <span className="text-white font-bold text-sm flex items-center gap-2">
                <Tv className="w-4 h-4 text-purple-400" />
                Thêm Kênh Phân Phối Mới
              </span>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Tên Kênh:</label>
                <input
                  type="text"
                  placeholder="VD: Kênh Review Phim Shorts"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Nền Tảng:</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as any)}
                  className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook (Reels)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Profile Gán Cùng:</label>
                <select
                  value={newProfile}
                  onChange={(e) => setNewProfile(e.target.value)}
                  className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Mặc định">Mặc định</option>
                  <option value="Truyện Đô Thị Fast">Truyện Đô Thị Fast</option>
                  <option value="Reup Review Douyin">Reup Review Douyin</option>
                  <option value="Shorts Anime & Manhua">Shorts Anime & Manhua</option>
                </select>
              </div>
            </div>

            <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleAddChannel}
                className="px-4 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-md transition-colors"
              >
                Thêm Kênh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
