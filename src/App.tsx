import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { TaskGrid } from './components/TaskGrid';
import { LiveLog } from './components/LiveLog';
import { VideoPreview } from './components/VideoPreview';
import { BatchSettingsForm } from './components/BatchSettings';
import { Footer } from './components/Footer';
import { AddVideoModal } from './components/AddVideoModal';
import { CookieModal } from './components/CookieModal';
import { TranslationModal } from './components/TranslationModal';
import { CapCutModal } from './components/CapCutModal';
import { CharacterSyncModal } from './components/CharacterSyncModal';
import { DependencyDoctorModal } from './components/DependencyDoctorModal';
import { VoiceStudioTab } from './components/VoiceStudioTab';
import { ReupStudioTab } from './components/ReupStudioTab';
import { ChannelManagerTab } from './components/ChannelManagerTab';
import { AudioNovelTab } from './components/AudioNovelTab';
import { useStudioStore } from './store/useStudioStore';

export const App: React.FC = () => {
  const { initApp, activeTopTab, studioMode } = useStudioStore();

  useEffect(() => {
    initApp();
  }, [initApp]);

  const renderMainContent = () => {
    // 1. Audio Novel Production Mode takes precedence if switched
    if (studioMode === 'TRUYEN_AUDIO') {
      return <AudioNovelTab />;
    }

    // 2. Navigation Tabs
    switch (activeTopTab) {
      case 'VOICE STUDIO':
        return <VoiceStudioTab />;
      case 'REUP STUDIO':
        return <ReupStudioTab />;
      case 'QUẢN LÝ KÊNH':
        return <ChannelManagerTab />;
      case 'PRO AUTOMATION':
      case 'Trang chủ':
      default:
        return (
          <main className="flex-1 flex overflow-hidden p-3 gap-3">
            {/* Left Column (58%): Control Panel + Task DataGrid + Live Log */}
            <section className="w-[58%] flex flex-col gap-3 min-w-0 h-full overflow-hidden">
              <ControlPanel />
              <TaskGrid />
              <LiveLog />
            </section>

            {/* Right Column (42%): Video Preview Canvas + Batch Settings Form */}
            <section className="w-[42%] flex flex-col gap-3 min-w-0 h-full overflow-y-auto pr-0.5">
              <VideoPreview />
              <BatchSettingsForm />
            </section>
          </main>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f141c] text-slate-200 overflow-hidden font-sans">
      {/* 1. Top Header & Navigation */}
      <Header />

      {/* 2. Main Body Content Switcher */}
      {renderMainContent()}

      {/* 3. Bottom Status Bar */}
      <Footer />

      {/* Modals */}
      <AddVideoModal />
      <CookieModal />
      <TranslationModal />
      <CapCutModal />
      <CharacterSyncModal />
      <DependencyDoctorModal />
    </div>
  );
};

export default App;
