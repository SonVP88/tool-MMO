import React from 'react';
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

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f141c] text-slate-200 overflow-hidden font-sans">
      {/* 1. Top Header & Navigation */}
      <Header />

      {/* 2. Main Content Split into 2 Columns (58% Left - 42% Right) */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left Column (58%): Control Panel + Task DataGrid + Live Log */}
        <section className="w-[58%] flex flex-col gap-3 min-w-0 h-full overflow-hidden">
          {/* Top Control Panel */}
          <ControlPanel />

          {/* Center Task DataGrid */}
          <TaskGrid />

          {/* Bottom Live Log */}
          <LiveLog />
        </section>

        {/* Right Column (42%): Video Preview Canvas + Batch Settings Form */}
        <section className="w-[42%] flex flex-col gap-3 min-w-0 h-full overflow-y-auto pr-0.5">
          {/* Interactive Video Preview Canvas */}
          <VideoPreview />

          {/* Batch Settings Form */}
          <BatchSettingsForm />
        </section>
      </main>

      {/* 3. Bottom Status Bar */}
      <Footer />

      {/* Modals */}
      <AddVideoModal />
      <CookieModal />
      <TranslationModal />
    </div>
  );
};

export default App;
