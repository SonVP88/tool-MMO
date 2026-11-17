import React, { useState, useEffect, useRef } from 'react';
import { 
  Headphones, 
  FileText, 
  Download, 
  RotateCw, 
  Music, 
  Sparkles,
  Volume2,
  Save,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { SubtitleLine } from '../types';

export const VoiceStudioTab: React.FC = () => {
  const { tasks, currentVideoId, setCurrentVideoId, outputDir, addLog } = useStudioStore();
  
  const currentTask = tasks.find((t) => t.id === currentVideoId) || tasks[0];

  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [isMergingAudio, setIsMergingAudio] = useState(false);
  const [hasRealSubtitles, setHasRealSubtitles] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load subtitles from backend whenever currentVideoId or tasks change
  useEffect(() => {
    if (!currentTask) return;
    loadSubtitlesFromBackend(currentTask.id);
  }, [currentTask?.id]);

  const loadSubtitlesFromBackend = async (taskId: number) => {
    setIsLoadingSubs(true);
    try {
      const res = await fetch(`http://127.0.0.1:5678/api/subtitles?task_id=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.subtitles) && data.subtitles.length > 0) {
          setSubtitles(data.subtitles);
          setHasRealSubtitles(true);
          addLog(`Đã tải ${data.subtitles.length} dòng phụ đề thực tế của Video #${taskId}`, 'success');
        } else {
          setHasRealSubtitles(false);
        }
      }
    } catch {
      // Backend might be offline or task not transcribed yet
      setHasRealSubtitles(false);
    } finally {
      setIsLoadingSubs(false);
    }
  };

  const handleTextChange = (index: number, newText: string) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.index === index ? { ...s, translatedText: newText } : s))
    );
  };

  const handleOriginalChange = (index: number, newText: string) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.index === index ? { ...s, originalText: newText } : s))
    );
  };

  const handleSpeakerChange = (index: number, newSpeaker: string) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.index === index ? { ...s, speaker: newSpeaker } : s))
    );
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', val: string) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.index === index ? { ...s, [field]: val } : s))
    );
  };

  const handleAddLine = () => {
    const nextIdx = subtitles.length > 0 ? Math.max(...subtitles.map((s) => s.index)) + 1 : 1;
    const newLine: SubtitleLine = {
      index: nextIdx,
      start: '00:00:10,000',
      end: '00:00:13,000',
      originalText: 'Thêm câu thoại mới...',
      translatedText: 'Nhập nội dung lồng tiếng mới tại đây...',
      speaker: 'Cô Gái Hoạt Ngôn (vi-VN)',
    };
    setSubtitles([...subtitles, newLine]);
    addLog(`Đã thêm câu thoại #${nextIdx}`, 'info');
  };

  const handleDeleteLine = (index: number) => {
    const filtered = subtitles.filter((s) => s.index !== index);
    // Re-index cleanly
    const reindexed = filtered.map((s, idx) => ({ ...s, index: idx + 1 }));
    setSubtitles(reindexed);
    addLog(`Đã xóa câu thoại #${index}`, 'warn');
  };

  const handlePlayVoice = async (index: number) => {
    const sub = subtitles.find((s) => s.index === index);
    if (!sub || !sub.translatedText?.trim()) return;

    if (playingIndex === index && audioRef.current) {
      audioRef.current.pause();
      setPlayingIndex(null);
      return;
    }

    try {
      setLoadingAudioIndex(index);
      addLog(`[Voice Studio] Đang tổng hợp giọng nói cho câu #${index}...`, 'info');

      const res = await fetch('http://127.0.0.1:5678/api/preview_voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sub.translatedText,
          voice: sub.speaker || 'Nam Miền Bắc Trầm Ấm (vi-VN)',
          speed: 1.0,
        }),
      });

      if (!res.ok) throw new Error('Không thể tạo file âm thanh');
      const data = await res.json();

      if (data.status === 'success' && data.audio_url) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = data.audio_url;
        audioRef.current.onended = () => {
          setPlayingIndex(null);
        };
        audioRef.current.onerror = () => {
          setPlayingIndex(null);
          addLog(`Lỗi khi phát âm thanh câu #${index}`, 'error');
        };

        await audioRef.current.play();
        setPlayingIndex(index);
        addLog(`▶ Đang phát câu #${index} (${sub.speaker})...`, 'success');
      } else {
        throw new Error(data.message || 'Lỗi xử lý audio');
      }
    } catch (err: any) {
      addLog(`Thất bại khi nghe thử câu #${index}: ${err.message}`, 'error');
    } finally {
      setLoadingAudioIndex(null);
    }
  };

  const handleSaveSubtitles = async () => {
    if (!currentTask) return;
    setIsSaving(true);
    try {
      const res = await fetch('http://127.0.0.1:5678/api/save_subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: currentTask.id,
          subtitles: subtitles,
        }),
      });
      if (res.ok) {
        addLog(`✓ Đã lưu thành công ${subtitles.length} câu phụ đề vào hệ thống!`, 'success');
      } else {
        throw new Error('Lỗi lưu phụ đề');
      }
    } catch (err: any) {
      addLog(`Lỗi khi lưu phụ đề: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
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
    addLog(`Đã tải xuống file phụ đề .SRT cho ${currentTask?.name || 'video'}.`, 'success');
  };

  const handleExportAss = () => {
    let assContent = `[Script Info]
Title: Studio MMO Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,2,2,10,10,65,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Convert comma time 00:00:00,500 to ass time 0:00:00.50
    const toAssTime = (t: string) => {
      const parts = t.replace(',', '.').split(':');
      if (parts.length === 3) {
        const h = parseInt(parts[0], 10);
        return `${h}:${parts[1]}:${parseFloat(parts[2]).toFixed(2).padStart(5, '0')}`;
      }
      return t;
    };

    subtitles.forEach((s) => {
      assContent += `Dialogue: 0,${toAssTime(s.start)},${toAssTime(s.end)},Default,,0,0,0,,${s.translatedText}\n`;
    });

    const blob = new Blob([assContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Subtitles_${currentTask?.name || 'video'}.ass`;
    a.click();
    addLog(`Đã xuất file phụ đề kiểu dáng cao cấp .ASS cho video ${currentTask?.name}.`, 'success');
  };

  const handleExportFullMp3 = async () => {
    if (!currentTask) return;
    setIsMergingAudio(true);
    addLog(`Đang gửi yêu cầu ghép toàn bộ âm thanh ra thư mục ${outputDir}...`, 'info');
    try {
      const res = await fetch('http://127.0.0.1:5678/api/merge_full_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: currentTask.id,
          output_dir: outputDir || 'C:\\Output',
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        addLog(`✓ Đã xuất file Audio MP3 hoàn chỉnh: ${data.path}`, 'success');
      } else {
        addLog(`Thông báo: ${data.message || 'Chưa hoàn tất render voice'}`, 'warn');
      }
    } catch (err: any) {
      addLog(`Lỗi ghép file MP3: ${err.message}`, 'error');
    } finally {
      setIsMergingAudio(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-hidden select-none bg-[#0f141c]">
      {/* Top Controls Toolbar */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-sm text-slate-100">
              VOICE STUDIO - BIÊN TẬP PHỤ ĐỀ & LỒNG TIẾNG CHI TIẾT
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

          {/* Select Video */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Video đang chọn:</span>
            <select
              value={currentVideoId}
              onChange={(e) => setCurrentVideoId(Number(e.target.value))}
              className="bg-[#0f141c] border border-[#26354a] rounded-lg px-2.5 py-1.5 text-slate-200 font-bold focus:outline-none focus:border-sky-500 max-w-[240px] truncate"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} - Video {t.name} ({t.status})
                </option>
              ))}
            </select>

            <button
              onClick={() => currentTask && loadSubtitlesFromBackend(currentTask.id)}
              disabled={isLoadingSubs}
              title="Tải lại phụ đề từ server"
              className="p-1.5 bg-[#1e2a3a] hover:bg-[#28384f] text-slate-300 rounded-lg transition-colors border border-[#2d3f56]"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingSubs ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleAddLine}
            className="px-2.5 py-1.5 bg-[#1b2738] hover:bg-[#25354d] text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Câu
          </button>

          <button
            onClick={handleSaveSubtitles}
            disabled={isSaving}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Lưu Phụ Đề
          </button>

          <button
            onClick={handleExportSrt}
            className="px-3 py-1.5 bg-[#1b2738] hover:bg-[#25354d] text-slate-200 border border-[#2e405a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Xuất .SRT
          </button>

          <button
            onClick={handleExportAss}
            className="px-3 py-1.5 bg-[#1b2738] hover:bg-[#25354d] text-slate-200 border border-[#2e405a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Xuất .ASS
          </button>

          <button
            onClick={handleExportFullMp3}
            disabled={isMergingAudio}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
          >
            {isMergingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Music className="w-3.5 h-3.5" />}
            Ghép File Audio .MP3
          </button>
        </div>
      </div>

      {/* Main Subtitle Table Editor */}
      <div className="bg-[#151c27] border border-[#253246] rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg">
        <div className="p-3 border-b border-[#233145] bg-[#111722] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              Danh Sách {subtitles.length} Câu Thoại (Click vào ô để sửa trực tiếp, bấm loa để nghe phát âm thanh thật)
            </span>
          </div>
          <div className="flex items-center gap-3">
            {hasRealSubtitles ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> Phụ đề thực tế từ video
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                <AlertCircle className="w-3.5 h-3.5" /> Bản xem trước mẫu
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-mono">
              Tổng số: {subtitles.length} câu
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-[#233145] pb-2 text-[11px] font-bold">
                <th className="py-2 px-2 w-10 text-center">#</th>
                <th className="py-2 px-2 w-36">Mốc Thời Gian</th>
                <th className="py-2 px-3 w-[28%]">Câu Gốc (Whisper ASR)</th>
                <th className="py-2 px-3">Câu Dịch Tiếng Việt (Sửa trực tiếp)</th>
                <th className="py-2 px-2 w-44">Giọng Đọc (Edge-TTS)</th>
                <th className="py-2 px-2 w-24 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2a3c]">
              {subtitles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-500">
                    {isLoadingSubs ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                        <span className="text-xs text-slate-300">Đang nạp phụ đề từ video...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="w-10 h-10 text-slate-600 mb-1" />
                        <span className="text-xs font-semibold text-slate-300">
                          Chưa có dữ liệu phụ đề cho {currentTask ? `Video #${currentTask.id}` : 'tác vụ này'}
                        </span>
                        <span className="text-[11px] text-slate-500 max-w-md">
                          Bấm nút <strong className="text-emerald-400">"Thêm Câu"</strong> ở trên để tự nhập câu thoại, hoặc chạy hàng đợi để Whisper AI trích xuất tự động từ video.
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                subtitles.map((sub) => (
                <tr key={sub.index} className="hover:bg-[#1a2436] transition-colors group">
                  <td className="py-2.5 px-2 text-center text-slate-500 font-mono text-[11px]">
                    {sub.index}
                  </td>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-slate-300">
                    <input
                      type="text"
                      value={sub.start}
                      onChange={(e) => handleTimeChange(sub.index, 'start', e.target.value)}
                      className="bg-transparent border border-transparent hover:border-[#233145] focus:border-sky-500 rounded px-1 py-0.5 text-amber-400 w-28 focus:outline-none"
                    />
                    <br />
                    <input
                      type="text"
                      value={sub.end}
                      onChange={(e) => handleTimeChange(sub.index, 'end', e.target.value)}
                      className="bg-transparent border border-transparent hover:border-[#233145] focus:border-sky-500 rounded px-1 py-0.5 text-slate-400 w-28 focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <textarea
                      rows={2}
                      value={sub.originalText}
                      onChange={(e) => handleOriginalChange(sub.index, e.target.value)}
                      className="w-full bg-[#0d131c] border border-[#233145] rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 resize-none font-normal leading-relaxed"
                    />
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
                      value={sub.speaker || 'Cô Gái Hoạt Ngôn (vi-VN)'}
                      onChange={(e) => handleSpeakerChange(sub.index, e.target.value)}
                      className="w-full bg-[#0d131c] border border-[#233145] rounded-md px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
                    >
                      <option value="Cô Gái Hoạt Ngôn (vi-VN)">Cô Gái Hoạt Ngôn (Hoài My - Nữ)</option>
                      <option value="Nam Miền Bắc Trầm Ấm (vi-VN)">Nam Miền Bắc (Nam Minh - Nam)</option>
                      <option value="Nam Miền Nam Truyền Cảm (vi-VN)">Nam Miền Nam (Truyền Cảm)</option>
                      <option value="Nữ Nhẹ Nhàng (vi-VN)">Nữ Nhẹ Nhàng (Hoài My)</option>
                      <option value="Giọng Trầm Kể Chuyện (vi-VN)">Giọng Trầm Kể Chuyện (Nam)</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        title="Nghe phát giọng đọc thật câu này ra loa máy tính"
                        onClick={() => handlePlayVoice(sub.index)}
                        disabled={loadingAudioIndex === sub.index}
                        className={`p-2 rounded-lg transition-colors ${
                          playingIndex === sub.index
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : loadingAudioIndex === sub.index
                            ? 'bg-amber-950/60 text-amber-400'
                            : 'text-sky-400 hover:bg-sky-950/60 hover:text-sky-300'
                        }`}
                      >
                        {loadingAudioIndex === sub.index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        title="Xóa câu này"
                        onClick={() => handleDeleteLine(sub.index)}
                        className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
