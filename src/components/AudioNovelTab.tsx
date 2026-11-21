import React, { useState } from 'react';
import { 
  Headphones, 
  BookOpen, 
  Music, 
  Play, 
  Upload,
  Sparkles
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const AudioNovelTab: React.FC = () => {
  const { addLog, outputDir, setStudioMode } = useStudioStore();

  const [storyText, setStoryText] = useState('');

  const [bgmVolume, setBgmVolume] = useState(12);
  const [bgmTrack, setBgmTrack] = useState('Nhạc Cổ Phong Du Dương (Dịu nhẹ)');
  const [bgVideo, setBgVideo] = useState('Video Phong Cảnh Anime 4K (Loop)');
  const [voice, setVoice] = useState('Nam Miền Bắc Trầm Ấm (vi-VN)');
  const [speed, setSpeed] = useState(1.10);
  const [isProducing, setIsProducing] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setStoryText(text);
          addLog(`Đã nạp thành công file truyện "${file.name}" (${text.split(/\s+/).length} từ).`, 'success');
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handleStartProduce = async () => {
    if (!storyText.trim()) {
      addLog('Vui lòng nhập hoặc dán nội dung chương truyện!', 'warn');
      return;
    }
    const firstLine = storyText.split('\n')[0].replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9 ]/g, '').trim();
    const cleanTitle = firstLine.slice(0, 35) || 'Chuong_Truyen';

    setIsProducing(true);
    addLog(`Đang gửi yêu cầu sản xuất Video Truyện Audio: "${cleanTitle}"...`, 'info');

    try {
      const res = await fetch('http://127.0.0.1:5678/api/produce_audio_novel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          storyText: storyText,
          voice: voice,
          speed: speed,
          bgmVolume: bgmVolume,
          bgmTrack: bgmTrack,
          bgVideo: bgVideo,
          outputDir: outputDir || '',
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        addLog(`✔ Đã nạp dự án "${cleanTitle}" vào hàng đợi sản xuất! Đang mở bảng điều khiển...`, 'success');
        setStudioMode('REUP');
      } else {
        addLog(`Lỗi tạo dự án: ${data.message || 'Không xác định'}`, 'error');
      }
    } catch (err: any) {
      addLog(`Lỗi kết nối máy chủ: ${err.message}`, 'error');
    } finally {
      setIsProducing(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-y-auto select-none bg-[#0f141c]">
      {/* Banner */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
              QUY TRÌNH TỰ ĐỘNG HÓA SẢN XUẤT TRUYỆN AUDIO & PODCAST
            </h2>
            <p className="text-[11px] text-slate-400">
              Chuyển đổi văn bản truyện chữ thành Video lồng tiếng AI kèm hình ảnh nền Loop và nhạc nền du dương
            </p>
          </div>
        </div>

        <button
          onClick={handleStartProduce}
          disabled={isProducing}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50"
        >
          {isProducing ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          {isProducing ? 'Đang Khởi Tạo...' : 'Tạo Video Truyện Audio Ngay'}
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3 flex-1 min-h-0">
        {/* Left: Text Input (3 cols) */}
        <div className="col-span-3 bg-[#151c27] border border-[#253246] rounded-xl p-3 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#233145] pb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Nội Dung Chương Truyện (Văn bản thuần):
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              Nạp File .TXT
            </button>
          </div>

          <textarea
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            rows={14}
            className="w-full flex-1 bg-[#0a0f16] border border-[#233145] rounded-xl p-3 text-xs text-slate-200 font-serif leading-relaxed focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="Dán nội dung truyện chữ tại đây..."
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Số từ: {storyText.split(/\s+/).length} từ</span>
            <span>Ước tính thời lượng phát: ~ 2 phút 15 giây</span>
          </div>
        </div>

        {/* Right: Audio & Visual Settings (2 cols) */}
        <div className="col-span-2 flex flex-col gap-3">
          {/* Card: Giọng Đọc & Tốc độ */}
          <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3.5 flex flex-col gap-3 shadow-lg text-xs">
            <div className="font-bold text-slate-200 border-b border-[#233145] pb-1.5 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-sky-400" />
              GIỌNG KỂ TRUYỆN AI (EDGE-TTS)
            </div>

            <div>
              <label className="text-slate-400 text-[11px] font-semibold block mb-1">Chọn giọng đọc truyền cảm:</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Nam Miền Bắc Trầm Ấm (vi-VN)">Nam Miền Bắc Trầm Ấm (vi-VN)</option>
                <option value="Nam Miền Nam Truyền Cảm (vi-VN)">Nam Miền Nam Truyền Cảm (vi-VN)</option>
                <option value="Cô Gái Hoạt Ngôn (vi-VN)">Cô Gái Hoạt Ngôn (vi-VN)</option>
                <option value="Nữ Nhẹ Nhàng (vi-VN)">Nữ Nhẹ Nhàng (vi-VN)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 font-semibold">Tốc độ đọc kể chuyện:</span>
                <span className="font-mono text-emerald-400 font-bold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Card: Nhạc Nền (BGM) & Video Loop */}
          <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3.5 flex flex-col gap-3 shadow-lg text-xs">
            <div className="font-bold text-slate-200 border-b border-[#233145] pb-1.5 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-amber-400" />
              HÌNH ẢNH NỀN & NHẠC BGM
            </div>

            <div>
              <label className="text-slate-400 text-[11px] font-semibold block mb-1">Video / Ảnh Nền (Loop):</label>
              <select
                value={bgVideo}
                onChange={(e) => setBgVideo(e.target.value)}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Video Phong Cảnh Anime 4K (Loop)">Video Phong Cảnh Anime 4K (Loop)</option>
                <option value="Video Mưa Rơi Cửa Sổ Lo-Fi">Video Mưa Rơi Cửa Sổ Lo-Fi</option>
                <option value="Ảnh Bìa Truyện 3D Chuyển Động">Ảnh Bìa Truyện 3D Chuyển Động</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-[11px] font-semibold block mb-1">Nhạc nền (BGM):</label>
              <select
                value={bgmTrack}
                onChange={(e) => setBgmTrack(e.target.value)}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Nhạc Cổ Phong Du Dương (Dịu nhẹ)">Nhạc Cổ Phong Du Dương (Dịu nhẹ)</option>
                <option value="Piano Trầm Buồn Tâm Trạng">Piano Trầm Buồn Tâm Trạng</option>
                <option value="Tiết Tấu Hồi Hộp Kịch Tính">Tiết Tấu Hồi Hộp Kịch Tính</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 font-semibold">Âm lượng BGM nền:</span>
                <span className="font-mono text-amber-400 font-bold">{bgmVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={bgmVolume}
                onChange={(e) => setBgmVolume(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="text-[10px] text-slate-500 mt-1">Giữ BGM dưới 15% để không lấn át giọng kể</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
