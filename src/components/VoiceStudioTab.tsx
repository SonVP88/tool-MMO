import React, { useState } from 'react';
import { 
  Headphones, 
  FileText, 
  Download, 
  RotateCw, 
  Music, 
  Sparkles,
  Volume2
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { SubtitleLine } from '../types';

export const VoiceStudioTab: React.FC = () => {
  const { tasks, currentVideoId, setCurrentVideoId, addLog } = useStudioStore();
  
  const currentTask = tasks.find((t) => t.id === currentVideoId) || tasks[0];

  // Mock subtitle dataset for active video
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([
    {
      index: 1,
      start: '00:00:00,500',
      end: '00:00:02,800',
      originalText: '第十七集 萧炎再入魔兽山脉',
      translatedText: 'Tập 17: Tiêu Viêm một lần nữa tiến vào Ma Thú Sơn Mạch.',
      speaker: 'Cô Gái Hoạt Ngôn (vi-VN)',
    },
    {
      index: 2,
      start: '00:00:03,000',
      end: '00:00:05,400',
      originalText: '为了寻找炼制七品丹药的珍稀药材',
      translatedText: 'Để tìm kiếm dược liệu quý hiếm luyện chế thất phẩm đan dược.',
      speaker: 'Cô Gái Hoạt Ngôn (vi-VN)',
    },
    {
      index: 3,
      start: '00:00:05,600',
      end: '00:00:07,800',
      originalText: '他独自面对潜伏在迷雾中的远古凶兽',
      translatedText: 'Hắn một mình đối mặt với hung thú cổ xưa ẩn mình trong làn sương mù.',
      speaker: 'Nam Miền Bắc Trầm Ấm (vi-VN)',
    },
    {
      index: 4,
      start: '00:00:08,000',
      end: '00:00:10,000',
      originalText: '这一次，异火的力量将再次爆发！',
      translatedText: 'Lần này, uy lực của Dị Hỏa sẽ một lần nữa bùng nổ đỉnh cao!',
      speaker: 'Nam Miền Bắc Trầm Ấm (vi-VN)',
    },
  ]);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const handleTextChange = (index: number, newText: string) => {
    setSubtitles(
      subtitles.map((s) => (s.index === index ? { ...s, translatedText: newText } : s))
    );
  };

  const handleSpeakerChange = (index: number, newSpeaker: string) => {
    setSubtitles(
      subtitles.map((s) => (s.index === index ? { ...s, speaker: newSpeaker } : s))
    );
  };

  const handlePlayVoice = (index: number) => {
    setPlayingIndex(index);
    addLog(`Đang nghe thử giọng đọc câu #${index}...`, 'info');
    setTimeout(() => {
      setPlayingIndex(null);
    }, 2200);
  };

  const handleRegenVoice = (index: number) => {
    addLog(`Đang tạo lại giọng đọc Edge-TTS cho câu #${index}...`, 'success');
  };

  const handleExportSrt = () => {
    let content = '';
    subtitles.forEach((s) => {
      content += `${s.index}\n${s.start} --> ${s.end}\n${s.translatedText}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Subtitles_${currentTask?.name || 'video'}.srt`;
    a.click();
    addLog('Đã xuất file phụ đề .SRT chuẩn xác.', 'success');
  };

  const handleExportAss = () => {
    addLog(`Đã xuất file phụ đề .ASS cho video ${currentTask?.name}.`, 'success');
  };

  const handleExportFullMp3 = () => {
    addLog(`Đang ghép toàn bộ các câu thành file Audio MP3 hoàn chỉnh...`, 'success');
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-hidden select-none bg-[#0f141c]">
      {/* Top Controls Toolbar */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-sm text-slate-100">
              VOICE STUDIO - BIÊN TẬP PHỤ ĐỀ & LỒNG TIẾNG CHI TIẾT
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          {/* Select Video */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Video đang chọn:</span>
            <select
              value={currentVideoId}
              onChange={(e) => setCurrentVideoId(Number(e.target.value))}
              className="bg-[#0f141c] border border-[#26354a] rounded-lg px-2.5 py-1 text-slate-200 font-bold focus:outline-none focus:border-sky-500"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} - Video {t.name} ({t.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSrt}
            className="px-3 py-1.5 bg-[#1b2738] hover:bg-[#25354d] text-slate-200 border border-[#2e405a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Xuất File .SRT
          </button>

          <button
            onClick={handleExportAss}
            className="px-3 py-1.5 bg-[#1b2738] hover:bg-[#25354d] text-slate-200 border border-[#2e405a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Xuất File .ASS
          </button>

          <button
            onClick={handleExportFullMp3}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Music className="w-3.5 h-3.5" />
            Ghép File Audio .MP3 Hoàn Chỉnh
          </button>
        </div>
      </div>

      {/* Main Subtitle Table Editor */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg">
        <div className="p-3 border-b border-[#233145] bg-[#111722] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Danh Sách 4 Câu Thoại (Click vào văn bản tiếng Việt để sửa trực tiếp)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Tổng thời lượng: 00:00:10.00 • 2 Giọng đọc được gán
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-[#233145] pb-2 text-[11px] font-bold">
                <th className="py-2 px-2 w-10 text-center">#</th>
                <th className="py-2 px-2 w-32">Mốc Thời Gian</th>
                <th className="py-2 px-3 w-[30%]">Câu Gốc (ASR Whisper)</th>
                <th className="py-2 px-3">Câu Dịch Tiếng Việt (Sửa trực tiếp)</th>
                <th className="py-2 px-2 w-44">Giọng Đọc (TTS)</th>
                <th className="py-2 px-2 w-28 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2a3c]">
              {subtitles.map((sub) => (
                <tr key={sub.index} className="hover:bg-[#1a2436] transition-colors group">
                  <td className="py-2.5 px-2 text-center text-slate-500 font-mono text-[11px]">
                    {sub.index}
                  </td>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-slate-300">
                    <span className="text-amber-400">{sub.start}</span>
                    <br />
                    <span className="text-slate-500">{sub.end}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {sub.originalText}
                  </td>
                  <td className="py-2.5 px-3">
                    <textarea
                      rows={2}
                      value={sub.translatedText}
                      onChange={(e) => handleTextChange(sub.index, e.target.value)}
                      className="w-full bg-[#0d131c] border border-[#233145] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none font-medium leading-relaxed"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      value={sub.speaker}
                      onChange={(e) => handleSpeakerChange(sub.index, e.target.value)}
                      className="w-full bg-[#0d131c] border border-[#233145] rounded-md px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="Cô Gái Hoạt Ngôn (vi-VN)">Cô Gái Hoạt Ngôn (vi-VN)</option>
                      <option value="Nam Miền Bắc Trầm Ấm (vi-VN)">Nam Miền Bắc Trầm Ấm (vi-VN)</option>
                      <option value="Nam Miền Nam Truyền Cảm (vi-VN)">Nam Miền Nam Truyền Cảm (vi-VN)</option>
                      <option value="Nữ Nhẹ Nhàng (vi-VN)">Nữ Nhẹ Nhàng (vi-VN)</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        title="Nghe thử câu thoại này"
                        onClick={() => handlePlayVoice(sub.index)}
                        className={`p-1.5 rounded text-sky-400 hover:bg-sky-950/60 ${
                          playingIndex === sub.index ? 'animate-bounce text-emerald-400' : ''
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <button
                        title="Tạo lại giọng đọc TTS cho riêng câu này"
                        onClick={() => handleRegenVoice(sub.index)}
                        className="p-1.5 rounded text-amber-400 hover:bg-amber-950/60"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
