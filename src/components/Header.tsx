import React, { useState } from 'react';
import { 
  Flame, 
  Sparkles, 
  Headphones, 
  Layers, 
  Tv, 
  Home, 
  Plus, 
  Save, 
  ChevronDown, 
  Settings2,
  CheckCircle2,
  Bot,
  Key
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { TopTab } from '../types';

export const Header: React.FC = () => {
  const {
    activeTopTab,
    setActiveTopTab,
    studioMode,
    setStudioMode,
    profiles,
    currentProfile,
    setCurrentProfile,
    addProfile,
    autoSaveTime,
    triggerAutoSave,
    geminiApiKey,
    setTranslationConfigOpen,
    addLog,
  } = useStudioStore();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNewProfileModal, setIsNewProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const navTabs: TopTab[] = [
    'PRO AUTOMATION',
    'VOICE STUDIO',
    'REUP STUDIO',
    'QUẢN LÝ KÊNH',
    'Trang chủ',
  ];

  const handleSaveConfig = async () => {
    await triggerAutoSave();
    addLog(`Đã lưu thành công cấu hình cho profile "${currentProfile}"`, 'success');
  };

  const handleCreateProfile = () => {
    if (newProfileName.trim()) {
      addProfile(newProfileName.trim());
      setNewProfileName('');
      setIsNewProfileModal(false);
    }
  };

  return (
    <header className="bg-[#121822] border-b border-[#253246] px-4 py-2 select-none flex flex-col gap-2 shrink-0">
      {/* Top Main Navigation */}
      <div className="flex items-center justify-between">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/30">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                TIỆM BÚN MMO
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 font-mono font-bold">
                PRO v2.2.1
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 tracking-wide">
              AUTOMATION STUDIO - TỰ ĐỘNG HÓA SẢN XUẤT HÀNG LOẠT
            </div>
          </div>
        </div>

        {/* Top Right Navigation Tabs */}
        <div className="flex items-center gap-1.5">
          {navTabs.map((tab) => {
            const isActive = activeTopTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTopTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab === 'PRO AUTOMATION' && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                {tab === 'VOICE STUDIO' && <Headphones className="w-3.5 h-3.5 text-sky-400" />}
                {tab === 'REUP STUDIO' && <Layers className="w-3.5 h-3.5 text-orange-400" />}
                {tab === 'QUẢN LÝ KÊNH' && <Tv className="w-3.5 h-3.5 text-purple-400" />}
                {tab === 'Trang chủ' && <Home className="w-3.5 h-3.5 text-slate-400" />}
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-bar: Modes + Profile Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-[#1e2a3c]">
        {/* Left: Mode Toggle */}
        <div className="flex items-center bg-[#0d131c] p-1 rounded-lg border border-[#253347] gap-1">
          <button
            onClick={() => setStudioMode('TRUYEN_AUDIO')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              studioMode === 'TRUYEN_AUDIO'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2332]'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            TỰ ĐỘNG HÓA TRUYỆN AUDIO
          </button>

          <button
            onClick={() => setStudioMode('REUP')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              studioMode === 'REUP'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2332]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            TỰ ĐỘNG HÓA REUP
          </button>
        </div>

        {/* Right: Profile Controls Bar */}
        <div className="flex items-center gap-2">
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="bg-[#182232] hover:bg-[#1e2b40] text-slate-200 border border-[#2d3e58] rounded-md px-3 py-1 text-xs font-medium flex items-center gap-2 min-w-[140px] justify-between transition-colors shadow-sm"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-400 text-[11px]">📁</span>
                <span className="truncate">{currentProfile}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#182232] border border-[#2d3e58] rounded-md shadow-xl py-1 z-50">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Cấu hình đã lưu
                </div>
                {profiles.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setCurrentProfile(p);
                      setIsProfileDropdownOpen(false);
                      addLog(`Đã tải profile: "${p}"`, 'info');
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-600/20 flex items-center justify-between ${
                      p === currentProfile ? 'text-emerald-400 font-semibold bg-emerald-950/30' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{p}</span>
                    {p === currentProfile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Profile Button */}
          <button
            onClick={() => setIsNewProfileModal(true)}
            className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo Profile
          </button>

          {/* Save Config Button */}
          <button
            onClick={handleSaveConfig}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu Cấu Hình
          </button>

          {/* API Key Quick Button */}
          <button
            onClick={() => setTranslationConfigOpen(true)}
            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              geminiApiKey
                ? 'bg-[#132c22] text-emerald-300 border border-emerald-500/50 hover:bg-[#193a2d]'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 animate-pulse font-black'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {(() => {
              const gCount = (geminiApiKey || '').split(/[\r\n,;]+/).map(k => k.trim()).filter(k => k.length > 10).length;
              return gCount > 1 ? `🔑 API Dịch (${gCount} Keys)` : gCount === 1 ? '🔑 API Dịch (Đã có)' : '🔑 NHẬP API KEY';
            })()}
          </button>

          {/* Manage Profiles Button */}
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="bg-[#1e2a3c] hover:bg-[#283952] text-slate-200 border border-[#2e405b] px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            Quản Lý Profile
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Auto Save Label */}
          <span className="text-[11px] text-emerald-400/80 font-mono ml-1">
            Tự động lưu ({autoSaveTime})
          </span>
        </div>
      </div>

      {/* Modal: New Profile */}
      {isNewProfileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#182232] border border-[#2d3e58] rounded-xl w-full max-w-sm p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Tạo Profile Cấu Hình Mới
            </h3>
            <input
              type="text"
              placeholder="VD: Reup Anime Vietsub 1080p..."
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="w-full bg-[#0f141c] border border-[#2e405b] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsNewProfileModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateProfile}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Xác Nhận Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
