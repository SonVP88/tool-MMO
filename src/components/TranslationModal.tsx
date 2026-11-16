import React, { useState } from 'react';
import { X, Sparkles, Check, Key } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const TranslationModal: React.FC = () => {
  const { 
    isTranslationConfigOpen, 
    setTranslationConfigOpen, 
    geminiApiKey,
    setGeminiApiKey,
    groqApiKey,
    setGroqApiKey,
    addLog 
  } = useStudioStore();
  const [apiKey, setApiKey] = useState(geminiApiKey);
  const [groqKey, setGroqKey] = useState(groqApiKey);
  const [prompt, setPrompt] = useState(
    'Dịch phụ đề tiếng Trung sang tiếng Việt mượt mà, văn phong lôi cuốn phù hợp thể loại review phim / anime, xưng hô chuẩn bối cảnh.'
  );

  if (!isTranslationConfigOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    setGroqApiKey(groqKey);
    addLog('Đã cập nhật khóa API và cấu hình dịch thuật AI.', 'success');
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
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              Gemini API Key (Dịch phụ đề):
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <Key className="w-3.5 h-3.5 text-sky-400" />
              Groq API Key (Whisper Speech-to-Text siêu tốc):
            </label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              System Prompt Dịch Thuật Tùy Chỉnh:
            </label>
            <textarea
              rows={4}
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
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Lưu Cấu Hình Dịch
          </button>
        </div>
      </div>
    </div>
  );
};

