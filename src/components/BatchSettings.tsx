import React from 'react';
import { 
  Sliders, 
  Users, 
  Settings, 
  Palette, 
  Volume2, 
  VolumeX, 
  Gauge, 
  ChevronDown
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const BatchSettingsForm: React.FC = () => {
  const {
    settings,
    updateSettings,
    addLog,
    setTranslationConfigOpen,
  } = useStudioStore();

  const handleSyncCharacters = () => {
    addLog('Đang đồng bộ từ điển nhân vật và thuật ngữ AI...', 'info');
  };

  return (
    <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex flex-col gap-2.5 shadow-lg select-none text-xs">
      {/* Title */}
      <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-[#233145] pb-1.5">
        <Sliders className="w-4 h-4 text-amber-400" />
        <span className="uppercase tracking-wider">CÀI ĐẶT XỬ LÝ HÀNG LOẠT</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Thể loại */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[11px] font-semibold">Thể loại:</label>
          <div className="relative">
            <select
              value={settings.genre}
              onChange={(e) => updateSettings({ genre: e.target.value })}
              className="w-full bg-[#0f141c] border border-[#26354a] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
            >
              <option value="Tự động">Tự động</option>
              <option value="Review Phim">Review Phim</option>
              <option value="Tiên hiệp / Huyền huyễn">Tiên hiệp / Huyền huyễn</option>
              <option value="Đô thị / Trọng sinh">Đô thị / Trọng sinh</option>
              <option value="Anime / Manhua">Anime / Manhua</option>
              <option value="Tin tức / Podcast">Tin tức / Podcast</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Chất lượng dịch */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[11px] font-semibold">Chất lượng dịch:</label>
          <div className="relative">
            <select
              value={settings.translationQuality}
              onChange={(e) => updateSettings({ translationQuality: e.target.value })}
              className="w-full bg-[#0f141c] border border-[#26354a] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
            >
              <option value="Tự nhiên / văn nói">Tự nhiên / văn nói</option>
              <option value="Sát nghĩa gốc">Sát nghĩa gốc</option>
              <option value="Hài hước / Bắt trend">Hài hước / Bắt trend</option>
              <option value="Tóm tắt ngắn gọn">Tóm tắt ngắn gọn</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 2: Character Sync & Translation Config Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleSyncCharacters}
          className="py-1.5 px-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm text-xs"
        >
          <Users className="w-3.5 h-3.5" />
          Đồng Bộ Nhân Vật
        </button>

        <button
          onClick={() => setTranslationConfigOpen(true)}
          className="py-1.5 px-2 bg-[#1b2738] hover:bg-[#25354d] text-slate-200 border border-[#2d3e56] rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm text-xs"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          Cấu Hình Dịch...
        </button>
      </div>

      {/* Voice Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-slate-400 text-[11px] font-semibold">Giọng đọc:</label>
        <div className="relative">
          <select
            value={settings.voice}
            onChange={(e) => updateSettings({ voice: e.target.value })}
            className="w-full bg-[#0f141c] border border-[#26354a] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
          >
            <option value="Cô Gái Hoạt Ngôn (vi-VN)">Cô Gái Hoạt Ngôn (vi-VN)</option>
            <option value="Nam Miền Bắc Trầm Ấm (vi-VN)">Nam Miền Bắc Trầm Ấm (vi-VN)</option>
            <option value="Nam Miền Nam Truyền Cảm (vi-VN)">Nam Miền Nam Truyền Cảm (vi-VN)</option>
            <option value="Nữ Nhẹ Nhàng (vi-VN)">Nữ Nhẹ Nhàng (vi-VN)</option>
            <option value="Giọng Trầm Kể Chuyện (vi-VN)">Giọng Trầm Kể Chuyện (vi-VN)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="space-y-2 pt-0.5">
        {/* Speed & Voice Volume */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tốc độ */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-400" />
                Tốc độ:
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.speed.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={settings.speed}
              onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Âm Voice */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-amber-400" />
                Âm Voice:
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.voiceVolume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={settings.voiceVolume}
              onChange={(e) => updateSettings({ voiceVolume: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Âm gốc */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <VolumeX className="w-3 h-3 text-slate-400" />
                Âm gốc:
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.originalAudioVolume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.originalAudioVolume}
              onChange={(e) => updateSettings({ originalAudioVolume: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="text-[10px] text-slate-500 italic pl-1">
            Giảm âm nền gốc để giọng đọc AI nổi bật rõ ràng
          </div>
        </div>

        {/* Che sub cũ & Độ mờ Blur */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-[11px] font-semibold">Che sub cũ:</label>
            <div className="relative">
              <select
                value={settings.subCoverMethod}
                onChange={(e) => updateSettings({ subCoverMethod: e.target.value })}
                className="w-full bg-[#0f141c] border border-[#26354a] rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
              >
                <option value="Làm mờ (Blur)">Làm mờ (Blur)</option>
                <option value="Hộp đen">Hộp đen mờ</option>
                <option value="Xóa viền">Xóa viền tự động</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold">Độ mờ Blur:</span>
              <span className="font-mono text-amber-400 font-bold">{settings.blurRadius}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={settings.blurRadius}
              onChange={(e) => updateSettings({ blurRadius: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Mẫu Sub mới & Cỡ chữ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-[11px] font-semibold">Mẫu Sub mới:</label>
            <div className="relative">
              <select
                value={settings.subTemplate}
                onChange={(e) => updateSettings({ subTemplate: e.target.value })}
                className="w-full bg-[#0f141c] border border-[#26354a] rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
              >
                <option value="DEFAULT">DEFAULT</option>
                <option value="SHORTS_BOLD">SHORTS BOLD</option>
                <option value="ANIME_YELLOW">ANIME YELLOW</option>
                <option value="CINEMA_CLASSIC">CINEMA CLASSIC</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold">Cỡ chữ:</span>
              <span className="font-mono text-amber-400 font-bold">{settings.fontSize} px</span>
            </div>
            <input
              type="range"
              min="14"
              max="50"
              step="1"
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Color Selectors Row */}
      <div className="flex items-center gap-3 pt-1 border-t border-[#233145]">
        {/* Màu Chữ */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-300 text-[11px] font-semibold flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            Màu Chữ:
          </label>
          <div className="relative flex items-center">
            <input
              type="color"
              value={settings.textColor}
              onChange={(e) => updateSettings({ textColor: e.target.value })}
              className="w-7 h-7 rounded border border-[#2d3e58] cursor-pointer bg-transparent"
            />
            <span
              className="ml-1 text-[11px] font-mono font-bold uppercase px-1 rounded bg-[#0f141c] border border-slate-700"
              style={{ color: settings.textColor }}
            >
              {settings.textColor}
            </span>
          </div>
        </div>

        {/* Màu Viền */}
        <div className="flex items-center gap-1.5 ml-auto">
          <label className="text-slate-300 text-[11px] font-semibold flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            Màu Viền:
          </label>
          <div className="relative flex items-center">
            <input
              type="color"
              value={settings.strokeColor}
              onChange={(e) => updateSettings({ strokeColor: e.target.value })}
              className="w-7 h-7 rounded border border-[#2d3e58] cursor-pointer bg-transparent"
            />
            <span
              className="ml-1 text-[11px] font-mono font-bold uppercase px-1 rounded bg-[#0f141c] border border-slate-700 text-slate-300"
            >
              {settings.strokeColor}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
