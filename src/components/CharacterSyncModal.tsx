import React, { useState } from 'react';
import { X, Users, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { CharacterMapping } from '../types';

export const CharacterSyncModal: React.FC = () => {
  const { 
    isCharacterModalOpen, 
    setCharacterModalOpen, 
    characters, 
    setCharacters, 
    addLog,
    freeVoices,
  } = useStudioStore();

  const [localChars, setLocalChars] = useState<CharacterMapping[]>(characters);
  const [newOrig, setNewOrig] = useState('');
  const [newTrans, setNewTrans] = useState('');
  const [newPronoun, setNewPronoun] = useState('Ta - Ngươi');
  const [newVoice, setNewVoice] = useState('');

  if (!isCharacterModalOpen) return null;

  const handleAdd = () => {
    if (!newOrig.trim() || !newTrans.trim()) {
      addLog('Vui lòng điền tên gốc và tên dịch.', 'warn');
      return;
    }
    const item: CharacterMapping = {
      id: Math.random().toString(),
      originalName: newOrig.trim(),
      translatedName: newTrans.trim(),
      pronoun: newPronoun,
      voice: newVoice,
    };
    setLocalChars([...localChars, item]);
    setNewOrig('');
    setNewTrans('');
  };

  const handleDelete = (id: string) => {
    setLocalChars(localChars.filter((c) => c.id !== id));
  };

  const handleSave = () => {
    setCharacters(localChars);
    addLog(`Đã lưu ${localChars.length} nhân vật vào từ điển dịch thuật AI.`, 'success');
    setCharacterModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#151c27] border border-[#2d3e58] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#101620] px-4 py-3 border-b border-[#233145] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Đồng Bộ Từ Điển Nhân Vật & Đa Giọng Đọc (Multi-Speaker)</span>
          </div>
          <button
            onClick={() => setCharacterModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description Banner */}
        <div className="p-4 border-b border-[#233145] bg-[#0c121a] flex items-center gap-2.5 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Từ điển này sẽ tự động được đưa vào System Prompt của <strong>Gemini 2.5 Flash</strong> để dịch chuẩn 100% danh xưng và phân bổ giọng đọc riêng cho từng nhân vật.
          </span>
        </div>

        {/* Add Form */}
        <div className="p-4 bg-[#111824] border-b border-[#233145] grid grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tên gốc (Trung/Anh):</label>
            <input
              type="text"
              placeholder="VD: 萧炎 / Tang San"
              value={newOrig}
              onChange={(e) => setNewOrig(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tên dịch chuẩn:</label>
            <input
              type="text"
              placeholder="VD: Tiêu Viêm / Đường Tam"
              value={newTrans}
              onChange={(e) => setNewTrans(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Xưng hô:</label>
            <select
              value={newPronoun}
              onChange={(e) => setNewPronoun(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Ta - Ngươi">Ta - Ngươi</option>
              <option value="Huynh - Đệ">Huynh - Đệ</option>
              <option value="Đệ tử - Sư phụ">Đệ tử - Sư phụ</option>
              <option value="Tôi - Bạn">Tôi - Bạn</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Giọng đọc gán riêng:</label>
            <select
              value={newVoice || (freeVoices[0]?.value ?? '')}
              onChange={(e) => setNewVoice(e.target.value)}
              className="w-full bg-[#0a0f16] border border-[#233145] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {freeVoices.length === 0 ? (
                <option value="">Đang tải giọng đọc...</option>
              ) : (
                freeVoices.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <button
              onClick={handleAdd}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Nhân Vật
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-[#233145] pb-2 text-[11px] font-bold">
                <th className="py-2 px-2">#</th>
                <th className="py-2 px-2">Tên Gốc</th>
                <th className="py-2 px-2">Tên Dịch Chuẩn</th>
                <th className="py-2 px-2">Quan Hệ Xưng Hô</th>
                <th className="py-2 px-2">Giọng Đọc Gán Riêng</th>
                <th className="py-2 px-2 text-center w-12">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2a3c]">
              {localChars.map((char, idx) => (
                <tr key={char.id} className="hover:bg-[#1a2436] transition-colors">
                  <td className="py-2 px-2 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                  <td className="py-2 px-2 font-mono font-bold text-amber-400">{char.originalName}</td>
                  <td className="py-2 px-2 font-semibold text-emerald-400">{char.translatedName}</td>
                  <td className="py-2 px-2 text-slate-300">{char.pronoun}</td>
                  <td className="py-2 px-2 text-slate-300 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-500/30">
                      {char.voice}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => handleDelete(char.id)}
                      className="p-1 rounded text-rose-400 hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {localChars.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-xs">
              Chưa có nhân vật nào trong từ điển. Hãy nhập tên ở trên để thêm.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#101620] px-4 py-3 border-t border-[#233145] flex items-center justify-end gap-2">
          <button
            onClick={() => setCharacterModalOpen(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Lưu Từ Điển Nhân Vật
          </button>
        </div>
      </div>
    </div>
  );
};
