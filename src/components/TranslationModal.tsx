import React, { useState } from 'react';
import { X, Sparkles, Check, Key, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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

  const handleTestGemini = async () => {
    if (!apiKey.trim()) {
      setGeminiStatus({ ok: false, msg: 'Vui lòng dán khóa Gemini API Key trước' });
      return;
    }
    setTestingGemini(true);
    setGeminiStatus(null);
    const res = await apiTestApiKey('gemini', apiKey.trim());
    setTestingGemini(false);
    if (res && res.valid) {
      setGeminiStatus({ ok: true, msg: 'Kết nối Gemini 2.5 Flash thành công!' });
      addLog('✔ Kiểm tra Gemini API Key: Kết nối thành công!', 'success');
    } else {
      setGeminiStatus({ ok: false, msg: res?.message || 'Khóa API không hợp lệ' });
      addLog(`✖ Kiểm tra Gemini API Key: ${res?.message || 'Lỗi'}`, 'error');
    }
  };

  const handleTestGroq = async () => {
    if (!groqKey.trim()) {
      setGroqStatus({ ok: false, msg: 'Vui lòng dán khóa Groq API Key trước' });
      return;
    }
    setTestingGroq(true);
    setGroqStatus(null);
    const res = await apiTestApiKey('groq', groqKey.trim());
    setTestingGroq(false);
    if (res && res.valid) {
      setGroqStatus({ ok: true, msg: 'Kết nối Groq Whisper thành công!' });
      addLog('✔ Kiểm tra Groq Whisper API: Kết nối thành công!', 'success');
    } else {
      setGroqStatus({ ok: false, msg: res?.message || 'Khóa API không hợp lệ' });
      addLog(`✖ Kiểm tra Groq API Key: ${res?.message || 'Lỗi'}`, 'error');
    }
  };

  const handleSave = async () => {
    setGeminiApiKey(apiKey.trim());
    setGroqApiKey(groqKey.trim());
    await triggerAutoSave();
    addLog('Đã lưu khóa API và cấu hình dịch thuật vào hệ thống.', 'success');
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
        <div className="p-4 flex flex-col gap-3">
          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                Gemini API Key (Dịch phụ đề ngữ cảnh Gemini 2.5 Flash):
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
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setGeminiStatus(null);
                }}
                className="flex-1 bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini || !apiKey.trim()}
                className="px-3 py-1.5 bg-[#1b283d] hover:bg-[#253957] disabled:opacity-50 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {testingGemini ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Kiểm Tra
              </button>
            </div>
            {geminiStatus && (
              <div className={`text-[11px] mt-1 flex items-center gap-1 font-medium ${geminiStatus.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {geminiStatus.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {geminiStatus.msg}
              </div>
            )}
          </div>

          {/* Groq API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                Groq API Key (Nhận diện giọng nói Whisper large-v3 siêu tốc):
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
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => {
                  setGroqKey(e.target.value);
                  setGroqStatus(null);
                }}
                className="flex-1 bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleTestGroq}
                disabled={testingGroq || !groqKey.trim()}
                className="px-3 py-1.5 bg-[#1b283d] hover:bg-[#253957] disabled:opacity-50 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {testingGroq ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Kiểm Tra
              </button>
            </div>
            {groqStatus && (
              <div className={`text-[11px] mt-1 flex items-center gap-1 font-medium ${groqStatus.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {groqStatus.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {groqStatus.msg}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              System Prompt Dịch Thuật Tùy Chỉnh:
            </label>
            <textarea
              rows={3}
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
