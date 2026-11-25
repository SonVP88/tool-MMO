import React, { useState } from 'react';
import { X, Sparkles, Check, Key, Loader2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { apiTestApiKey } from '../services/tauriBridge';

export const TranslationModal: React.FC = () => {
  const { 
    isTranslationConfigOpen, 
    setTranslationConfigOpen, 
    geminiApiKey, 
    setGeminiApiKey, 
    groqApiKey, 
    setGroqApiKey, 
    triggerAutoSave, 
    addLog 
  } = useStudioStore();

  const [apiKey, setApiKey] = useState(geminiApiKey);
  const [groqKey, setGroqKey] = useState(groqApiKey);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [testingGroq, setTestingGroq] = useState(false);
  const [groqStatus, setGroqStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [prompt, setPrompt] = useState(
    'Dịch phụ đề video sang tiếng Việt mượt mà, văn phong lôi cuốn phù hợp thể loại phim / anime, xưng hô chuẩn bối cảnh.'
  );

  if (!isTranslationConfigOpen) return null;

  const geminiKeysList = apiKey.split(/[\r\n,;]+/).map(k => k.trim()).filter(k => k.length > 10);
  const geminiCount = geminiKeysList.length;

  const groqKeysList = groqKey.split(/[\r\n,;]+/).map(k => k.trim()).filter(k => k.length > 10);
  const groqCount = groqKeysList.length;

  const handleTestGemini = async () => {
    if (!apiKey.trim()) {
      setGeminiStatus({ ok: false, msg: 'Vui lòng dán ít nhất 1 khóa Gemini API Key trước' });
      return;
    }
    setTestingGemini(true);
    setGeminiStatus(null);
    const res = await apiTestApiKey('gemini', apiKey.trim());
    setTestingGemini(false);
    if (res && res.valid) {
      setGeminiStatus({ ok: true, msg: res.message || 'Kết nối Gemini thành công!' });
      addLog(`✔ ${res.message || 'Kiểm tra Gemini API Key: Kết nối thành công!'}`, 'success');
    } else {
      setGeminiStatus({ ok: false, msg: res?.message || 'Khóa API không hợp lệ' });
      addLog(`✖ Kiểm tra Gemini API Key: ${res?.message || 'Lỗi'}`, 'error');
    }
  };

  const handleTestGroq = async () => {
    if (!groqKey.trim()) {
      setGroqStatus({ ok: false, msg: 'Vui lòng dán ít nhất 1 khóa Groq API Key trước' });
      return;
    }
    setTestingGroq(true);
    setGroqStatus(null);
    const res = await apiTestApiKey('groq', groqKey.trim());
    setTestingGroq(false);
    if (res && res.valid) {
      setGroqStatus({ ok: true, msg: res.message || 'Kết nối Groq Whisper thành công!' });
      addLog(`✔ ${res.message || 'Kiểm tra Groq Whisper API: Kết nối thành công!'}`, 'success');
    } else {
      setGroqStatus({ ok: false, msg: res?.message || 'Khóa API không hợp lệ' });
      addLog(`✖ Kiểm tra Groq API Key: ${res?.message || 'Lỗi'}`, 'error');
    }
  };

  const handleSave = async () => {
    setGeminiApiKey(apiKey.trim());
    setGroqApiKey(groqKey.trim());
    await triggerAutoSave();
    const gCount = apiKey.split(/[\r\n,;]+/).map(k => k.trim()).filter(k => k.length > 10).length;
    addLog(`Đã lưu ${gCount > 1 ? `${gCount} Gemini Keys (Xoay tua chia tải)` : 'khóa API'} và cấu hình dịch thuật vào hệ thống.`, 'success');
    setTranslationConfigOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Cấu Hình Dịch Thuật AI & Nhận Diện Giọng Nói</span>
          </div>
          <button
            onClick={() => setTranslationConfigOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto">
          {/* Rate-Limit Strategy Banner */}
          <div className="bg-[#0b1320] border border-blue-500/25 rounded-xl p-3 text-[11px] text-slate-300 flex flex-col gap-1.5 shadow-sm">
            <div className="font-semibold text-blue-400 flex items-center gap-1.5 text-xs">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Cơ chế Xoay Tua Chống Giới Hạn Quota (Rate Limit 429)</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Tài khoản Google miễn phí giới hạn <strong>15 yêu cầu/phút (RPM)</strong>. Tool hỗ trợ dán <strong>nhiều API Keys</strong> (mỗi key 1 dòng hoặc cách nhau bằng dấu phẩy). Hệ thống sẽ tự động <strong>xoay tua chia tải đều (Round-Robin)</strong> và tự động đổi key dự phòng ngay lập tức khi chạm limit, giúp dịch hàng loạt video mà không bao giờ bị dừng!
            </p>
          </div>

          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                Gemini API Keys (Hỗ trợ 1 hoặc nhiều Keys - Xoay tua chống 429):
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-amber-400 hover:underline"
              >
                Lấy Key miễn phí ↗
              </a>
            </div>
            <div className="flex flex-col gap-1.5">
              <textarea
                rows={3}
                placeholder="Dán 1 hoặc nhiều Gemini Keys tại đây (mỗi key 1 dòng hoặc cách nhau bằng dấu phẩy)&#10;AIzaSyKey1...&#10;AIzaSyKey2..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setGeminiStatus(null);
                }}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {geminiCount > 1 ? (
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                      🔥 {geminiCount} Keys phát hiện: Xoay tua Round-Robin & Chống Limit 429
                    </span>
                  ) : geminiCount === 1 ? (
                    <span className="text-[10px] bg-blue-950/80 text-sky-400 border border-sky-500/40 px-2 py-0.5 rounded-md font-medium">
                      🟢 1 Key: Điều tốc tự động chống chạm ngưỡng 15 RPM
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Chưa nhập Key (sẽ dùng bộ dịch dự phòng)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={testingGemini || !apiKey.trim()}
                  className="px-3 py-1 bg-[#1b283d] hover:bg-[#253957] disabled:opacity-50 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {testingGemini ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Kiểm Tra {geminiCount > 1 ? `(${geminiCount} Keys)` : 'Key'}
                </button>
              </div>
            </div>
            {geminiStatus && (
              <div className={`text-[11px] mt-1.5 p-2 rounded-lg border flex items-start gap-1.5 font-medium ${geminiStatus.ok ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'}`}>
                {geminiStatus.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                <span className="leading-tight">{geminiStatus.msg}</span>
              </div>
            )}
          </div>

          {/* Groq API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                Groq API Keys (Nhận diện giọng nói Whisper large-v3 siêu tốc):
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:underline"
              >
                Lấy Key miễn phí ↗
              </a>
            </div>
            <div className="flex flex-col gap-1.5">
              <textarea
                rows={2}
                placeholder="gsk_Key1...&#10;gsk_Key2..."
                value={groqKey}
                onChange={(e) => {
                  setGroqKey(e.target.value);
                  setGroqStatus(null);
                }}
                className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {groqCount > 1 ? (
                    <span className="text-[10px] bg-sky-950/80 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-md font-semibold">
                      🔥 {groqCount} Groq Keys xoay tua
                    </span>
                  ) : groqCount === 1 ? (
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      🟢 1 Groq Key Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Chưa nhập Groq Key
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleTestGroq}
                  disabled={testingGroq || !groqKey.trim()}
                  className="px-3 py-1 bg-[#1b283d] hover:bg-[#253957] disabled:opacity-50 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {testingGroq ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Kiểm Tra {groqCount > 1 ? `(${groqCount} Keys)` : 'Key'}
                </button>
              </div>
            </div>
            {groqStatus && (
              <div className={`text-[11px] mt-1.5 p-2 rounded-lg border flex items-start gap-1.5 font-medium ${groqStatus.ok ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'}`}>
                {groqStatus.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                <span className="leading-tight">{groqStatus.msg}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              System Prompt Dịch Thuật Tùy Chỉnh:
            </label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-end gap-2">
          <button
            onClick={() => setTranslationConfigOpen(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Lưu Cấu Hình Dịch
          </button>
        </div>
      </div>
    </div>
  );
};
