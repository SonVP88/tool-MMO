import React, { useState } from 'react';
import { 
  Tv, 
  Plus, 
  FolderOpen, 
  Play, 
  Trash2, 
  CheckCircle2
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { ChannelItem } from '../types';

export const ChannelManagerTab: React.FC = () => {
  const { openFolder, addLog } = useStudioStore();

  const [channels, setChannels] = useState<ChannelItem[]>([
    {
      id: '1',
      name: 'Review Phim Anime Hay',
      platform: 'TikTok',
      profile: 'Reup Review Douyin',
      outputFolder: 'C:\\Output\\TikTok_Anime',
      watermark: 'logo_anime_tiktok.png',
      totalVideos: 142,
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Ghiền Hoạt Hình 3D Shorts',
      platform: 'YouTube',
      profile: 'Shorts Anime & Manhua',
      outputFolder: 'C:\\Output\\YT_Shorts_3D',
      watermark: 'logo_yt_shorts.png',
      totalVideos: 89,
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'Góc Truyện Tiên Hiệp Đô Thị',
      platform: 'Facebook',
      profile: 'Truyện Đô Thị Fast',
      outputFolder: 'C:\\Output\\FB_Reels_Audio',
      watermark: 'logo_reels.png',
      totalVideos: 56,
      status: 'ACTIVE',
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState<'TikTok' | 'YouTube' | 'Facebook'>('TikTok');
  const [newProfile, setNewProfile] = useState('Reup Review Douyin');

  const handleAddChannel = () => {
    if (!newName.trim()) return;
    const item: ChannelItem = {
      id: Math.random().toString(),
      name: newName.trim(),
      platform: newPlatform,
      profile: newProfile,
      outputFolder: `C:\\Output\\${newPlatform}_${newName.trim().replace(/\s+/g, '_')}`,
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
          className="px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-950/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          + Thêm Kênh Mới
        </button>
      </div>

      {/* Channel Grid Cards */}
      <div className="grid grid-cols-3 gap-3">
        {channels.map((chan) => (
          <div
            key={chan.id}
            className="bg-[#151c27] border border-[#253246] rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-emerald-500/40 transition-all"
          >
            <div>
              {/* Header card */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    chan.platform === 'TikTok'
                      ? 'bg-rose-950/70 text-rose-400 border-rose-500/30'
                      : chan.platform === 'YouTube'
                      ? 'bg-red-950/70 text-red-400 border-red-500/30'
                      : 'bg-blue-950/70 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {chan.platform}
                </span>

                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Đang hoạt động
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-100 mb-1 truncate" title={chan.name}>
                {chan.name}
              </h3>

              <div className="text-[11px] text-slate-400 space-y-1 mt-2">
                <div className="flex justify-between">
                  <span>Profile gán:</span>
                  <strong className="text-slate-200">{chan.profile}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Đã sản xuất:</span>
                  <strong className="text-emerald-400 font-mono">{chan.totalVideos} videos</strong>
                </div>
                <div className="truncate text-[10px] font-mono text-slate-500 mt-1" title={chan.outputFolder}>
                  📁 {chan.outputFolder}
                </div>
              </div>
            </div>

            {/* Actions bottom */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#233145]">
              <button
                onClick={() => openFolder(chan.outputFolder)}
                className="flex-1 py-1.5 bg-[#1b2535] hover:bg-[#253549] text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-[#2b3a4f]"
              >
                <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                Mở Thư Mục
              </button>

              <button
                onClick={() => addLog(`Nạp hàng đợi theo profile kênh "${chan.name}"...`, 'info')}
                className="py-1.5 px-2.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                title="Bắt đầu sản xuất cho kênh này"
              >
                <Play className="w-3 h-3 fill-emerald-400" />
                Sản Xuất
              </button>

              <button
                onClick={() => handleDelete(chan.id)}
                className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg text-xs"
                title="Xóa kênh"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Channel */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-md shadow-2xl p-4 flex flex-col gap-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Tv className="w-4 h-4 text-sky-400" />
              Thêm Kênh Phân Phối Mới
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tên Kênh:</label>
              <input
                type="text"
                placeholder="VD: Kênh Review Truyện Hay"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nền tảng:</label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as any)}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube Shorts</option>
                <option value="Facebook">Facebook Reels</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Gán Profile Cấu Hình:</label>
              <select
                value={newProfile}
                onChange={(e) => setNewProfile(e.target.value)}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Reup Review Douyin">Reup Review Douyin</option>
                <option value="Shorts Anime & Manhua">Shorts Anime & Manhua</option>
                <option value="Truyện Đô Thị Fast">Truyện Đô Thị Fast</option>
                <option value="Mặc định">Mặc định</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#233145]">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleAddChannel}
                className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-bold shadow-md"
              >
                Lưu Kênh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
