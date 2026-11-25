import React from 'react';
import { 
  Sliders, 
  Users, 
  Settings, 
  Palette, 
  Volume2, 
  VolumeX, 
  Gauge, 
  ChevronDown, 
  Video, 
  Zap, 
  Sparkles, 
  HardDrive, 
  Folder, 
  FolderOpen,
  RefreshCcw
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { apiSelectFolder } from '../services/tauriBridge';

export const BatchSettingsForm: React.FC = () => {
  const {
    settings,
    updateSettings,
    geminiApiKey,
    outputDir,
    setOutputDir,
    openFolder,
    setTranslationConfigOpen,
    setCapCutConfigOpen,
    setCharacterModalOpen,
    freeVoices,
    proVoices,
    refreshVoices,
  } = useStudioStore();

  const activeCapcutVoices = settings.capcutAccountType === 'FREE' ? freeVoices : proVoices;

  const handleSyncCharacters = () => {
    setCharacterModalOpen(true);
  };

  const handleSelectOutputFolder = async () => {
    const selected = await apiSelectFolder();
    if (selected) {
      setOutputDir(selected);
    }
  };

  return (
    <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex flex-col gap-2.5 shadow-lg select-none text-xs">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-1.5">
        <div className="flex items-center gap-2 text-slate-200 font-bold">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="uppercase tracking-wider">CÀI ĐẶT XỬ LÝ HÀNG LOẠT</span>
        </div>
        <button
          onClick={() => setCapCutConfigOpen(true)}
          className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded transition-colors"
        >
          <Video className="w-3 h-3 text-emerald-400" />
          Cấu Hình CapCut PC
        </button>
      </div>

      {/* Prominent Render Engine Selector */}
      <div className="bg-[#0e141e] p-2 rounded-lg border border-[#253347] flex flex-col gap-1">
        <label className="text-slate-300 text-[11px] font-bold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Chế độ xuất (Render Engine):
        </label>
        <div className="relative">
          <select
            value={settings.renderEngine || 'FFmpeg Siêu Tốc (Chạy ngầm 100%)'}
            onChange={(e) => {
              const val = e.target.value;
              const updates: any = { renderEngine: val };
              if (val.includes('FFmpeg')) {
                updates.aiEngineMode = 'CLOUD_LOCAL';
              } else if (val.includes('Tự Động Hóa CapCut')) {
                updates.aiEngineMode = 'CAPCUT_PRO_NATIVE';
              }
              updateSettings(updates);
            }}
            className="w-full bg-[#151d2a] border border-[#2e405a] rounded-md px-2.5 py-1.5 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
          >
            <option value="FFmpeg Siêu Tốc (Chạy ngầm 100%)">
              ⚡ FFmpeg Siêu Tốc (Chạy ngầm 100%)
            </option>
            <option value="Tạo Dự Án Nháp CapCut (Draft Injection - Để tự mở CapCut chỉnh thêm)">
              🎬 Tạo Dự Án Nháp CapCut (Draft Injection - Để tự mở CapCut chỉnh thêm)
            </option>
            <option value="Tự Động Hóa CapCut Toàn Diện (Tự tạo Timeline + Tự mở CapCut bấm Xuất Video)">
              🤖 Tự Động Hóa CapCut Toàn Diện (Tự tạo Timeline + Tự mở CapCut bấm Xuất Video)
            </option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Thư Mục Nhận Dữ Liệu Đầu Ra (Tùy chọn ổ C, D, E...) */}
      <div className="bg-[#0e141e] p-2 rounded-lg border border-[#253347] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-slate-300 text-[11px] font-bold flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            Thư Mục Xuất Video (Tùy chọn Ổ C, D, E...):
          </label>
          <span className="text-[10px] text-sky-400 font-mono font-bold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/30">
            {outputDir ? outputDir.split('\\')[0] || 'C:' : 'C:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={outputDir}
            onChange={(e) => setOutputDir(e.target.value)}
            placeholder="Mặc định: thư mục output của tool (hoặc D:\Videos, E:\Output...)"
            className="flex-1 bg-[#151d2a] border border-[#2e405a] rounded px-2.5 py-1 text-xs text-sky-200 font-mono focus:outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={handleSelectOutputFolder}
            className="px-2 py-1 bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
            title="Duyệt và chọn thư mục trên ổ đĩa"
          >
            <Folder className="w-3 h-3 text-sky-400" />
            Chọn Thư Mục...
          </button>
          <button
            type="button"
            onClick={() => openFolder(outputDir)}
            className="p-1 bg-[#1a2332] hover:bg-[#253448] border border-[#2c3d54] text-slate-300 rounded transition-colors cursor-pointer"
            title="Mở thư mục trong File Explorer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Quick Drive Selector Pills */}
        <div className="flex items-center gap-1.5 pt-0.5 text-[10px]">
          <span className="text-slate-500">Chuyển nhanh:</span>
          {['', 'D:\\Output', 'E:\\Output'].map((path) => (
            <button
              key={path || 'default'}
              type="button"
              onClick={() => setOutputDir(path)}
              className={`px-1.5 py-0.5 rounded font-mono border transition-colors cursor-pointer ${
                outputDir === path
                  ? 'bg-sky-900/60 border-sky-400 text-sky-200 font-bold'
                  : 'bg-[#151d2a] border-[#293a50] text-slate-400 hover:text-slate-200'
              }`}
            >
              {path || 'Mặc định (output)'}
            </button>
          ))}
          <span className="text-slate-500 italic ml-auto text-[9px]">
            *Thoải mái đổi sang ổ D, E để tránh đầy ổ hệ thống
          </span>
        </div>
      </div>

      {/* AI Engine Mode Selector (Native CapCut Pro / Hybrid / Cloud Local) */}
      <div className="bg-[#0e141e] p-2 rounded-lg border border-[#253347] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-slate-300 text-[11px] font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Nguồn xử lý AI (AI Engine Mode):
          </label>
          {settings.aiEngineMode === 'CAPCUT_PRO_NATIVE' && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-400/30">
              VIP CapCut Pro (0đ API)
            </span>
          )}
        </div>
        <div className="relative">
          <select
            value={settings.aiEngineMode || 'CAPCUT_PRO_NATIVE'}
            onChange={(e) => {
              const mode = e.target.value as any;
              const updates: any = { aiEngineMode: mode };
              if (mode === 'CAPCUT_PRO_NATIVE' || mode === 'HYBRID_PRO') {
                updates.renderEngine = 'Tự Động Hóa CapCut Toàn Diện (Tự tạo Timeline + Tự mở CapCut bấm Xuất Video)';
              }
              updateSettings(updates);
            }}
            className="w-full bg-[#151d2a] border border-[#2e405a] rounded-md px-2.5 py-1.5 text-xs text-purple-300 font-semibold focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
          >
            <option value="CAPCUT_PRO_NATIVE">
              👑 Native CapCut Pro (Dùng 100% Tách Sub, Dịch & Giọng VIP CapCut Pro)
            </option>
            <option value="HYBRID_PRO">
              ⚡ Hybrid Pro (Dịch ngữ cảnh bằng Gemini + Đọc bằng Giọng VIP CapCut Pro)
            </option>
            <option value="CLOUD_LOCAL">
              ☁️ Cloud/Local AI Pipeline (Whisper + Gemini + Edge-TTS ngầm)
            </option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* CapCut Auto Pipeline Visual Workflow */}
        {settings.aiEngineMode !== 'CLOUD_LOCAL' && (
          <div className="bg-[#121926] p-2 rounded border border-purple-500/20 text-[10px] space-y-1.5">
            <div className="text-purple-300 font-bold flex items-center justify-between">
              <span>
                {settings.capcutAccountType === 'FREE'
                  ? '🆓 Luồng CapCut Thường (Free-Safe - Né Paywall 100%):'
                  : '👑 Luồng CapCut Pro 2026 (Full Tính Năng VIP):'}
              </span>
              <span className="text-emerald-400 text-[9px] bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-500/30">
                Tự động 100%
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px]">
              <div className="bg-[#1a2332] p-1 rounded border border-[#27384e] text-slate-300">
                <span className="block font-bold text-amber-400">BƯỚC 1</span>
                Nạp Video & Tỷ Lệ
              </div>
              <div className="bg-[#1a2332] p-1 rounded border border-[#27384e] text-slate-300">
                <span className="block font-bold text-blue-400">BƯỚC 2</span>
                {settings.capcutAccountType === 'FREE' ? 'Blur Free-Safe' : 'Blur Native Pro'}
              </div>
              <div className="bg-[#1a2332] p-1 rounded border border-[#27384e] text-slate-300">
                <span className="block font-bold text-purple-400">BƯỚC 3</span>
                {settings.capcutAccountType === 'FREE' ? 'Sub Gemini Free' : 'Sub Song Ngữ Pro'}
              </div>
              <div className="bg-[#1a2332] p-1 rounded border border-[#27384e] text-slate-300">
                <span className="block font-bold text-emerald-400">BƯỚC 4</span>
                {settings.capcutAccountType === 'FREE' ? 'Edge-TTS Free' : 'Giọng VIP AI'}
              </div>
              <div className="bg-[#1a2332] p-1 rounded border border-[#27384e] text-slate-300">
                <span className="block font-bold text-rose-400">BƯỚC 5</span>
                {settings.capcutAccountType === 'FREE' ? 'Xuất 1080p Mượt' : 'Xuất 4K/60fps'}
              </div>
            </div>
          </div>
        )}

        {/* CapCut Account Type & Voice Configuration */}
        {settings.aiEngineMode !== 'CLOUD_LOCAL' && (
          <div className="pt-1.5 border-t border-[#1e2a3c] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Tài khoản CapCut:</label>
                <select
                  value={settings.capcutAccountType || 'PRO'}
                  onChange={(e) => updateSettings({ capcutAccountType: e.target.value as any })}
                  className="w-full bg-[#111722] border border-[#233145] rounded px-2 py-1 text-[11px] text-amber-300 font-semibold focus:outline-none"
                >
                  <option value="PRO">👑 CapCut PRO (Dùng Full VIP)</option>
                  <option value="FREE">🆓 CapCut Thường (Tự tránh VIP để xuất mượt)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] text-slate-400 font-medium">
                    {settings.capcutAccountType === 'FREE' ? 'Giọng đọc tự nhiên (Edge-TTS Live):' : 'Giọng đọc VIP CapCut (config/voices.json):'}
                  </label>
                  <button
                    type="button"
                    onClick={refreshVoices}
                    title="Tải lại danh sách giọng đọc mới nhất"
                    className="text-[9px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <RefreshCcw className="w-2.5 h-2.5" /> Tải lại
                  </button>
                </div>
                <select
                  value={settings.capcutVipVoice || (activeCapcutVoices[0]?.value ?? '')}
                  onChange={(e) => updateSettings({ capcutVipVoice: e.target.value })}
                  className="w-full bg-[#111722] border border-[#233145] rounded px-2 py-1 text-[11px] text-amber-300 font-semibold focus:outline-none"
                >
                  {activeCapcutVoices.length === 0 ? (
                    <option value="">Đang tải danh sách giọng...</option>
                  ) : (
                    activeCapcutVoices.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="syncSpeed"
                  checked={settings.capcutSyncSpeed !== false}
                  onChange={(e) => updateSettings({ capcutSyncSpeed: e.target.checked })}
                  className="rounded border-[#26354a] bg-[#0f141c] text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="syncSpeed" className="text-slate-300 cursor-pointer select-none">
                  Đồng bộ tốc độ giọng đọc ăn khớp 100% với phụ đề
                </label>
              </div>
              <span className="text-slate-500 italic">
                {settings.capcutAccountType === 'FREE' ? 'Tự động tránh trả phí' : 'Không giới hạn tính năng'}
              </span>
            </div>
          </div>
        )}
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
          className="py-1.5 px-2 bg-[#1b2738] hover:bg-[#25354d] text-slate-200 border border-[#2d3e56] rounded-md font-semibold flex items-center justify-between transition-colors shadow-sm text-xs cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Cấu Hình API Dịch</span>
          </div>
          {(() => {
            const gCount = (geminiApiKey || '').split(/[\r\n,;]+/).map(k => k.trim()).filter(k => k.length > 10).length;
            return (
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${gCount > 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'}`}>
                {gCount > 1 ? `Gemini Active (${gCount} Keys)` : gCount === 1 ? 'Gemini 2.5 Active' : 'Chưa nhập Key'}
              </span>
            );
          })()}
        </button>
      </div>

      {/* Voice Selection (Dynamic Live Edge-TTS) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-slate-400 text-[11px] font-semibold">Giọng đọc AI (Live):</label>
          <button
            type="button"
            onClick={refreshVoices}
            className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCcw className="w-2.5 h-2.5" /> Cập nhật
          </button>
        </div>
        <div className="relative">
          <select
            value={settings.voice || (freeVoices[0]?.value ?? '')}
            onChange={(e) => updateSettings({ voice: e.target.value })}
            className="w-full bg-[#0f141c] border border-[#26354a] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
          >
            {freeVoices.length === 0 ? (
              <option value="">Đang tải danh sách giọng từ Edge-TTS...</option>
            ) : (
              freeVoices.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))
            )}
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

        {/* Bộ Lọc & Xử Lý Âm Thanh Chuyên Sâu */}
        <div className="bg-[#0e141e] p-2 rounded-lg border border-[#253347] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 text-[11px] font-bold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              Bộ Lọc & Xử Lý Âm Gốc:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="audioDenoise"
                checked={settings.audioDenoise !== false}
                onChange={(e) => updateSettings({ audioDenoise: e.target.checked })}
                className="rounded border-[#26354a] bg-[#0f141c] text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="audioDenoise" className="text-[10px] text-cyan-300 cursor-pointer select-none">
                Khử ồn FFT (Denoise)
              </label>
            </div>
          </div>

          <div className="relative">
            <select
              value={settings.audioFilterMode || 'vocal_cut'}
              onChange={(e) => {
                const mode = e.target.value as any;
                const updates: any = { audioFilterMode: mode };
                if (mode === 'mute_original') {
                  updates.originalAudioVolume = 0;
                } else if (settings.originalAudioVolume === 0) {
                  updates.originalAudioVolume = 20;
                }
                updateSettings(updates);
              }}
              className="w-full bg-[#151d2a] border border-[#2e405a] rounded-md px-2.5 py-1.5 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
            >
              <option value="vocal_cut">
                🎤 Khử giọng nói gốc (Vocal Cut - Triệt lời thoại, giữ BGM & SFX)
              </option>
              <option value="ducking">
                📉 Tự động né âm (Smart Ducking - BGM tự giảm khi AI đọc)
              </option>
              <option value="mute_original">
                🔇 Tắt hoàn toàn tiếng gốc (100% Giọng đọc AI thuyết minh)
              </option>
              <option value="mix_normal">
                🎚️ Trộn âm thông thường (Theo tỷ lệ % âm lượng)
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 top-2.5 pointer-events-none" />
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
                {settings.audioFilterMode === 'mute_original' ? '0% (Muted)' : `${settings.originalAudioVolume}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              disabled={settings.audioFilterMode === 'mute_original'}
              value={settings.audioFilterMode === 'mute_original' ? 0 : settings.originalAudioVolume}
              onChange={(e) => updateSettings({ originalAudioVolume: parseInt(e.target.value) })}
              className={`w-full accent-amber-500 cursor-pointer ${settings.audioFilterMode === 'mute_original' ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="text-[10px] text-slate-400 italic pl-1 leading-tight">
            {settings.audioFilterMode === 'vocal_cut' && '⚡ Khử giọng gốc, giữ lại nhạc nền & âm thanh võ thuật sống động'}
            {settings.audioFilterMode === 'ducking' && '📉 Nhạc nền tự hạ khi AI thuyết minh, tự tăng khi ngắt câu'}
            {settings.audioFilterMode === 'mute_original' && '🔇 Tắt hoàn toàn âm thanh gốc, chống bản quyền âm thanh 100%'}
            {settings.audioFilterMode === 'mix_normal' && '🎚️ Giảm âm nền gốc theo % cài đặt để tôn giọng AI'}
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
