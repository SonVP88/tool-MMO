import { create } from 'zustand';
import type { 
  TopTab, 
  StudioMode, 
  FilterTab, 
  TaskItem, 
  BoundingBox, 
  LogEntry, 
  BatchSettings,
  TaskProgressEvent,
  LiveLogEvent
} from '../types';
import {
  isTauri,
  apiLoadProfiles,
  apiSaveProfile,
  apiSaveCurrentSettings,
  apiGetTasks,
  apiAddTasks,
  apiStartQueue,
  apiPauseQueue,
  apiCancelQueue,
  apiRetryFailed,
  apiRetrySelected,
  apiDeleteSelected,
  apiDeleteWaiting,
  apiCleanDone,
  apiDeleteTask,
  apiOpenOutputFolder,
  apiOpenFile,
  listenTauriEvent
} from '../services/tauriBridge';

interface StudioState {
  // Navigation & Profile
  activeTopTab: TopTab;
  studioMode: StudioMode;
  profiles: string[];
  currentProfile: string;
  autoSaveTime: string;

  // API Keys & Config
  geminiApiKey: string;
  groqApiKey: string;
  douyinCookie: string;
  outputDir: string;

  // Task Queue
  tasks: TaskItem[];
  filterTab: FilterTab;
  isRunning: boolean;
  isPaused: boolean;
  globalProgress: {
    processed: number;
    total: number;
    percent: number;
    estimatedTime: string;
  };

  // Preview & Subtitle Bounding Boxes
  currentVideoId: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  oldSubBlurBox: BoundingBox;
  newSubBox: BoundingBox;

  // Batch Settings
  settings: BatchSettings;

  // Logs
  logs: LogEntry[];

  // Modals
  isAddVideoModalOpen: boolean;
  isCookieModalOpen: boolean;
  isTranslationConfigOpen: boolean;

  // Actions
  initApp: () => Promise<void>;
  setActiveTopTab: (tab: TopTab) => void;
  setStudioMode: (mode: StudioMode) => void;
  setCurrentProfile: (profile: string) => void;
  addProfile: (name: string) => Promise<void>;
  setFilterTab: (tab: FilterTab) => void;
  toggleTaskSelect: (id: number) => void;
  selectAllTasks: (selected: boolean) => void;
  toggleRun: () => Promise<void>;
  pauseRun: () => Promise<void>;
  stopRun: () => Promise<void>;
  retryErrors: () => Promise<void>;
  retrySelected: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  deleteWaiting: () => Promise<void>;
  cleanDone: () => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  addTask: (name: string, path?: string) => Promise<void>;
  addBatchTasks: (items: string[]) => Promise<void>;
  setCurrentVideoId: (id: number) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setOldSubBlurBox: (box: Partial<BoundingBox>) => void;
  setNewSubBox: (box: Partial<BoundingBox>) => void;
  updateSettings: (settings: Partial<BatchSettings>) => void;
  setGeminiApiKey: (key: string) => void;
  setGroqApiKey: (key: string) => void;
  setDouyinCookie: (cookie: string) => void;
  setOutputDir: (dir: string) => void;
  addLog: (message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  openFolder: (path?: string) => void;
  openVideoFile: (path: string) => void;
  setAddVideoModalOpen: (open: boolean) => void;
  setCookieModalOpen: (open: boolean) => void;
  setTranslationConfigOpen: (open: boolean) => void;
  triggerAutoSave: () => Promise<void>;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  activeTopTab: 'PRO AUTOMATION',
  studioMode: 'REUP',
  profiles: ['Mặc định', 'Truyện Đô Thị Fast', 'Reup Review Douyin', 'Shorts Anime & Manhua'],
  currentProfile: 'Mặc định',
  autoSaveTime: '11:31:09',

  geminiApiKey: 'AIzaSyD-mock-gemini-pro-key-auto',
  groqApiKey: 'gsk_mock_whisper_groq_fast_key',
  douyinCookie: 'odin_tt=1a2b3c...; sessionid_ss=8f9a0...;',
  outputDir: 'C:\\Output',

  tasks: [
    {
      id: 17,
      name: '17',
      stage: 'Hoàn tất',
      progress: 100,
      status: 'DONE',
      note: 'Render hoàn tất không lỗi',
      outputPath: 'C:\\Output\\Reup_17.mp4',
      selected: false,
    },
    {
      id: 18,
      name: '18',
      stage: 'Hoàn tất',
      progress: 100,
      status: 'DONE',
      note: 'Render hoàn tất không lỗi',
      outputPath: 'C:\\Output\\Reup_18.mp4',
      selected: false,
    },
    {
      id: 19,
      name: '19',
      stage: 'Hoàn tất',
      progress: 100,
      status: 'DONE',
      note: 'Render hoàn tất không lỗi',
      outputPath: 'C:\\Output\\Reup_19.mp4',
      selected: false,
    },
    {
      id: 20,
      name: '20',
      stage: 'Lấy phụ đề',
      progress: 28,
      status: 'SUBTITLE',
      note: 'Đang trích xuất audio & chạy Whisper...',
      outputPath: 'C:\\Output\\Reup_20.mp4',
      selected: true,
    },
    {
      id: 21,
      name: '21',
      stage: 'Chờ chạy',
      progress: 0,
      status: 'WAITING',
      note: 'Nằm trong hàng đợi tiến trình',
      outputPath: 'C:\\Output\\Reup_21.mp4',
      selected: false,
    },
  ],

  filterTab: 'ALL',
  isRunning: false,
  isPaused: false,
  globalProgress: {
    processed: 3,
    total: 5,
    percent: 65.6,
    estimatedTime: '4m 30s',
  },

  currentVideoId: 17,
  isPlaying: false,
  currentTime: 0,
  duration: 268,

  oldSubBlurBox: {
    x: 18,
    y: 72,
    width: 32,
    height: 9,
  },
  newSubBox: {
    x: 20,
    y: 78,
    width: 60,
    height: 11,
  },

  settings: {
    genre: 'Tự động',
    translationQuality: 'Tự nhiên / văn nói',
    voice: 'Cô Gái Hoạt Ngôn (vi-VN)',
    speed: 1.0,
    voiceVolume: 100,
    originalAudioVolume: 20,
    subCoverMethod: 'Làm mờ (Blur)',
    blurRadius: 25,
    subTemplate: 'DEFAULT',
    fontSize: 25,
    textColor: '#f59e0b',
    strokeColor: '#000000',
  },

  logs: [
    {
      id: '1',
      timestamp: '11:28:10',
      message: 'Khởi tạo Studio MMO Core v2.2.1 kết nối thành công.',
      type: 'info',
    },
    {
      id: '2',
      timestamp: '11:28:45',
      message: '[Video 17] Tải xong, xử lý phụ đề và lồng tiếng hoàn tất.',
      type: 'success',
    },
    {
      id: '3',
      timestamp: '11:29:20',
      message: '[Video 18] Render hoàn tất: C:\\Output\\Reup_18.mp4',
      type: 'success',
    },
    {
      id: '4',
      timestamp: '11:30:05',
      message: '[Video 19] Gộp audio Edge-TTS và đóng dấu sub thành công.',
      type: 'success',
    },
    {
      id: '5',
      timestamp: '11:30:50',
      message: '[Video 20] Bắt đầu tách giọng nói: Whisper Groq API (vi-VN)...',
      type: 'info',
    },
    {
      id: '6',
      timestamp: '11:31:09',
      message: 'Đã tự động lưu cấu hình profile "Mặc định".',
      type: 'info',
    },
  ],

  isAddVideoModalOpen: false,
  isCookieModalOpen: false,
  isTranslationConfigOpen: false,

  initApp: async () => {
    if (isTauri()) {
      // 1. Load profiles from Rust backend
      const profiles = await apiLoadProfiles();
      if (profiles && profiles.length > 0) {
        set({
          profiles: profiles.map((p) => p.name),
          currentProfile: profiles[0].name,
        });
      }

      // 2. Load tasks from Rust backend
      const tasks = await apiGetTasks();
      if (tasks && tasks.length > 0) {
        set({ tasks });
      }

      // 3. Listen to realtime task-progress events from Rust
      await listenTauriEvent<TaskProgressEvent>('task-progress', (event) => {
        set((state) => {
          const updatedTasks = state.tasks.map((t) =>
            t.id === event.task_id
              ? {
                  ...t,
                  stage: event.stage,
                  progress: event.progress,
                  status: event.status as any,
                  note: event.note,
                  outputPath: event.output_path || t.outputPath,
                }
              : t
          );
          return {
            tasks: updatedTasks,
            globalProgress: {
              processed: event.global_processed,
              total: event.global_total,
              percent: Math.round(event.global_percent),
              estimatedTime: event.estimated_time,
            },
          };
        });
      });

      // 4. Listen to live-log events from Rust
      await listenTauriEvent<LiveLogEvent>('live-log', (event) => {
        get().addLog(event.message, event.log_type as any);
      });
    }
  },

  setActiveTopTab: (tab) => set({ activeTopTab: tab }),
  setStudioMode: (mode) => set({ studioMode: mode }),
  setCurrentProfile: (profile) => set({ currentProfile: profile }),

  addProfile: async (name) => {
    if (!name.trim()) return;
    const currentSettings = get().settings;
    set((state) => ({
      profiles: [...state.profiles, name],
      currentProfile: name,
    }));
    if (isTauri()) {
      await apiSaveProfile({
        name,
        settings: currentSettings,
        updated_at: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      });
    }
    get().addLog(`Đã tạo Profile mới: "${name}"`, 'success');
  },

  setFilterTab: (tab) => set({ filterTab: tab }),

  toggleTaskSelect: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)),
    })),

  selectAllTasks: (selected) =>
    set((state) => ({
      tasks: state.tasks.map((t) => ({ ...t, selected })),
    })),

  toggleRun: async () => {
    const nextState = !get().isRunning;
    set({ isRunning: nextState, isPaused: false });

    if (nextState) {
      if (isTauri()) {
        await apiStartQueue();
      } else {
        // Fallback simulation loop for browser dev mode
        get().addLog('▶ [Dev Mode] Kích hoạt hàng đợi tự động chạy mô phỏng...', 'info');
        const interval = setInterval(() => {
          const currentTasks = get().tasks;
          const waiting = currentTasks.find((t) => t.status === 'WAITING' || t.status === 'PROCESSING');
          if (!waiting || !get().isRunning) {
            clearInterval(interval);
            return;
          }
          const nextProg = Math.min(100, waiting.progress + 20);
          const nextStage =
            nextProg >= 100
              ? 'Hoàn tất'
              : nextProg >= 80
              ? 'Render video'
              : nextProg >= 60
              ? 'Tạo giọng đọc'
              : nextProg >= 40
              ? 'Dịch AI'
              : 'Lấy phụ đề';

          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === waiting.id
                ? {
                    ...t,
                    progress: nextProg,
                    stage: nextStage,
                    status: nextProg === 100 ? 'DONE' : 'PROCESSING',
                    note: `Tiến độ: ${nextProg}%`,
                  }
                : t
            ),
          }));
        }, 1200);
      }
    } else {
      if (isTauri()) {
        await apiCancelQueue();
      }
    }
  },

  pauseRun: async () => {
    const isPaused = !get().isPaused;
    set({ isPaused });
    if (isTauri()) {
      await apiPauseQueue();
    } else {
      get().addLog(isPaused ? '⏸ Tạm dừng xử lý hàng đợi.' : '▶ Tiếp tục xử lý hàng đợi.', 'warn');
    }
  },

  stopRun: async () => {
    set({ isRunning: false, isPaused: false });
    if (isTauri()) {
      await apiCancelQueue();
    } else {
      get().addLog('⏹ Đã hủy toàn bộ quy trình đang chạy.', 'error');
    }
  },

  retryErrors: async () => {
    if (isTauri()) {
      await apiRetryFailed();
    } else {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.status === 'ERROR' || t.status === 'CANCELED'
            ? { ...t, status: 'WAITING', progress: 0, stage: 'Chờ chạy' }
            : t
        ),
      }));
      get().addLog('⟳ Đã đưa các tác vụ lỗi về trạng thái chờ chạy.', 'info');
    }
  },

  retrySelected: async () => {
    const selectedIds = get()
      .tasks.filter((t) => t.selected)
      .map((t) => t.id);
    if (isTauri()) {
      await apiRetrySelected(selectedIds);
    } else {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.selected ? { ...t, status: 'WAITING', progress: 0, stage: 'Chờ chạy' } : t
        ),
      }));
      get().addLog('⟳ Đã đưa các mục đã chọn về trạng thái chờ chạy.', 'info');
    }
  },

  deleteSelected: async () => {
    const selectedIds = get()
      .tasks.filter((t) => t.selected)
      .map((t) => t.id);
    if (isTauri()) {
      await apiDeleteSelected(selectedIds);
    } else {
      set((state) => ({
        tasks: state.tasks.filter((t) => !t.selected),
      }));
      get().addLog('Đã xóa các mục đã chọn khỏi hàng đợi.', 'warn');
    }
  },

  deleteWaiting: async () => {
    if (isTauri()) {
      await apiDeleteWaiting();
    } else {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.status !== 'WAITING'),
      }));
      get().addLog('Đã xóa các mục đang chờ khỏi hàng đợi.', 'warn');
    }
  },

  cleanDone: async () => {
    if (isTauri()) {
      await apiCleanDone();
    } else {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.status !== 'DONE'),
      }));
      get().addLog('Đã dọn dẹp các tác vụ đã hoàn tất.', 'info');
    }
  },

  deleteTask: async (id) => {
    if (isTauri()) {
      await apiDeleteTask(id);
    }
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
    get().addLog(`Đã xóa video #${id} khỏi danh sách.`, 'warn');
  },

  addTask: async (name, path) => {
    await get().addBatchTasks([path || name]);
  },

  addBatchTasks: async (items) => {
    if (items.length === 0) return;
    if (isTauri()) {
      const updated = await apiAddTasks(items);
      if (updated) {
        set({ tasks: updated });
      }
    } else {
      const baseId = Date.now();
      const newTasks: TaskItem[] = items.map((item, idx) => ({
        id: baseId + idx,
        name: item.split(/[\/\\]/).pop()?.replace('.mp4', '') || `Video_${baseId + idx}`,
        stage: 'Chờ chạy',
        progress: 0,
        status: 'WAITING',
        note: 'Vừa thêm vào hàng đợi',
        outputPath: `C:\\Output\\Reup_${item.split(/[\/\\]/).pop() || 'Video'}.mp4`,
        selected: false,
      }));
      set((state) => ({
        tasks: [...state.tasks, ...newTasks],
        globalProgress: {
          ...state.globalProgress,
          total: state.tasks.length + newTasks.length,
        },
      }));
      get().addLog(`+ Đã thêm ${items.length} video vào hàng đợi.`, 'info');
    }
  },

  setCurrentVideoId: (id) => set({ currentVideoId: id }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),

  setOldSubBlurBox: (box) => {
    set((state) => ({
      oldSubBlurBox: { ...state.oldSubBlurBox, ...box },
    }));
    get().triggerAutoSave();
  },

  setNewSubBox: (box) => {
    set((state) => ({
      newSubBox: { ...state.newSubBox, ...box },
    }));
    get().triggerAutoSave();
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().triggerAutoSave();
  },

  setGeminiApiKey: (key) => {
    set({ geminiApiKey: key });
    get().triggerAutoSave();
  },
  setGroqApiKey: (key) => {
    set({ groqApiKey: key });
    get().triggerAutoSave();
  },
  setDouyinCookie: (cookie) => {
    set({ douyinCookie: cookie });
    get().triggerAutoSave();
  },
  setOutputDir: (dir) => {
    set({ outputDir: dir });
    get().triggerAutoSave();
  },

  triggerAutoSave: async () => {
    const now = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    set({ autoSaveTime: now });
    if (isTauri()) {
      const state = get();
      await apiSaveCurrentSettings(
        state.settings,
        state.oldSubBlurBox,
        state.newSubBox,
        state.geminiApiKey,
        state.groqApiKey,
        state.douyinCookie,
        state.outputDir
      );
    }
  },

  addLog: (message, type = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      message,
      type,
    };
    set((state) => ({
      logs: [...state.logs.slice(-70), newLog],
    }));
  },

  openFolder: (path) => {
    if (isTauri()) {
      apiOpenOutputFolder(path);
    } else {
      get().addLog(`Đang mở thư mục: ${path || 'C:\\Output'}`, 'info');
    }
  },

  openVideoFile: (path) => {
    if (isTauri()) {
      apiOpenFile(path);
    } else {
      get().addLog(`Mở video phát: ${path}`, 'info');
    }
  },

  setAddVideoModalOpen: (open) => set({ isAddVideoModalOpen: open }),
  setCookieModalOpen: (open) => set({ isCookieModalOpen: open }),
  setTranslationConfigOpen: (open) => set({ isTranslationConfigOpen: open }),
}));
