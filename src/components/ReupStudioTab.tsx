import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FlipHorizontal, 
  Crop, 
  Sliders, 
  Save, 
  Image as ImageIcon
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { AntiCopyrightSettings } from '../types';

export const ReupStudioTab: React.FC = () => {
  const { settings: globalSettings, updateSettings, triggerAutoSave, addLog } = useStudioStore();

  const [settings, setSettings] = useState<AntiCopyrightSettings>(
    globalSettings.antiCopyright || {
      flipHorizontal: true,
      cropZoom: 104,
      brightness: 2,
      contrast: 1.05,
      saturation: 1.10,
      noiseOverlay: 2,
      watermarkPath: '',
      introPath: '',
      outroPath: '',
      stripMetadata: true,
      randomizeMd5: true,
    }
  );

  const handleApply = () => {
    updateSettings({ antiCopyright: settings });
    triggerAutoSave();
    addLog('✔ Đã kích hoạt bộ lọc Lách Bản Quyền (Anti-Copyright) vào quy trình render thật!', 'success');
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-y-auto select-none bg-[#0f141c]">
      {/* Header Banner */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
              REUP STUDIO - BỘ LỌC BIẾN ĐỔI VIDEO & LÁCH BẢN QUYỀN NỀN TẢNG
            </h2>
            <p className="text-[11px] text-slate-400">
              Vượt AI kiểm duyệt trùng lặp của TikTok, YouTube Shorts và Facebook Reels
            </p>
          </div>
        </div>

        <button
          onClick={handleApply}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-950/40 transition-all"
        >
          <Save className="w-4 h-4" />
          Áp Dụng Cho Hàng Đợi
        </button>
      </div>

      {/* Grid Controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Card: Biến đổi hình học & Zoom */}
        <div className="bg-[#151c27] border border-[#253246] rounded-xl p-4 flex flex-col gap-3.5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-[#233145] pb-2 text-xs">
            <Crop className="w-4 h-4 text-emerald-400" />
            <span>BIẾN ĐỔI HÌNH HỌC & KHUNG HÌNH</span>
          </div>

          {/* Lật ngang video */}
          <div className="flex items-center justify-between bg-[#0e141f] p-2.5 rounded-lg border border-[#243347]">
            <div className="flex items-center gap-2">
              <FlipHorizontal className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Lật ngang video (Horizontal Flip)</div>
                <div className="text-[10px] text-slate-500">Đảo chiều góc quay để phá mã nhận diện trùng khớp</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.flipHorizontal}
              onChange={(e) => setSettings({ ...settings, flipHorizontal: e.target.checked })}
              className="w-4 h-4 rounded bg-[#151c27] border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Phóng to cắt viền */}
          <div className="flex flex-col gap-1.5 bg-[#0e141f] p-2.5 rounded-lg border border-[#243347]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Phóng to cắt viền (Crop & Zoom):</span>
              <span className="font-mono text-emerald-400 font-bold">{settings.cropZoom}%</span>
            </div>
            <input
              type="range"
              min="100"
              max="115"
              step="1"
              value={settings.cropZoom}
              onChange={(e) => setSettings({ ...settings, cropZoom: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Cắt bỏ 2-6% viền ngoài để vô hiệu hóa phát hiện khung hình gốc</div>
          </div>

          {/* Noise / Hạt nhiễu */}
          <div className="flex flex-col gap-1.5 bg-[#0e141f] p-2.5 rounded-lg border border-[#243347]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Lớp phủ ẩn / Hạt nhiễu (Noise Overlay):</span>
              <span className="font-mono text-amber-400 font-bold">{settings.noiseOverlay}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={settings.noiseOverlay}
              onChange={(e) => setSettings({ ...settings, noiseOverlay: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Mắt người không nhận ra nhưng phá vỡ chữ ký số pixel của video gốc</div>
          </div>
        </div>

        {/* Right Card: Chỉnh màu sắc & Metadata */}
        <div className="bg-[#151c27] border border-[#253246] rounded-xl p-4 flex flex-col gap-3.5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-[#233145] pb-2 text-xs">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>HIỆU CHỈNH MÀU SẮC & CHỮ KÝ TỆP</span>
          </div>

          {/* Brightness */}
          <div className="flex flex-col gap-1 bg-[#0e141f] p-2.5 rounded-lg border border-[#243347]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Độ sáng (Brightness):</span>
              <span className="font-mono text-amber-400 font-bold">+{settings.brightness}%</span>
            </div>
            <input
              type="range"
              min="-10"
              max="15"
              value={settings.brightness}
              onChange={(e) => setSettings({ ...settings, brightness: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Contrast & Saturation */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 bg-[#0e141f] p-2 rounded-lg border border-[#243347]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Tương phản:</span>
                <span className="font-mono text-emerald-400 font-bold">{settings.contrast}x</span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.3"
                step="0.05"
                value={settings.contrast}
                onChange={(e) => setSettings({ ...settings, contrast: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1 bg-[#0e141f] p-2 rounded-lg border border-[#243347]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Độ rực rỡ:</span>
                <span className="font-mono text-emerald-400 font-bold">{settings.saturation}x</span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.4"
                step="0.05"
                value={settings.saturation}
                onChange={(e) => setSettings({ ...settings, saturation: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Metadata & MD5 Hash */}
          <div className="flex flex-col gap-2 pt-1 border-t border-[#233145]">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={settings.stripMetadata}
                onChange={(e) => setSettings({ ...settings, stripMetadata: e.target.checked })}
                className="rounded bg-[#0f141c] border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="font-semibold text-slate-200">Xóa sạch toàn bộ Metadata nguồn của file MP4</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={settings.randomizeMd5}
                onChange={(e) => setSettings({ ...settings, randomizeMd5: e.target.checked })}
                className="rounded bg-[#0f141c] border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="font-semibold text-slate-200">Đổi ngẫu nhiên mã băm MD5 / SHA-256 sau khi render</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Card: Watermark, Intro, Outro Branding */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl p-4 flex flex-col gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-[#233145] pb-2 text-xs">
          <ImageIcon className="w-4 h-4 text-sky-400" />
          <span>ĐÓNG DẤU THƯƠNG HIỆU & ĐOẠN ĐẦU / ĐUÔI VIDEO</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Logo Watermark kênh (.png trong suốt):
            </label>
            <input
              type="text"
              value={settings.watermarkPath}
              onChange={(e) => setSettings({ ...settings, watermarkPath: e.target.value })}
              className="w-full bg-[#0a0f16] border border-[#26354a] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Clip mở đầu (Intro 2-3s):
            </label>
            <input
              type="text"
              value={settings.introPath}
              onChange={(e) => setSettings({ ...settings, introPath: e.target.value })}
              className="w-full bg-[#0a0f16] border border-[#26354a] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Clip kêu gọi Follow (Outro 4-5s):
            </label>
            <input
              type="text"
              value={settings.outroPath}
              onChange={(e) => setSettings({ ...settings, outroPath: e.target.value })}
              className="w-full bg-[#0a0f16] border border-[#26354a] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
