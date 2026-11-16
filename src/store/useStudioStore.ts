import { create } from 'zustand';
import type { TopTab, StudioMode, FilterTab, TaskItem, BoundingBox, LogEntry, BatchSettings } from '../types';

interface StudioState {
  // Navigation & Profile
  activeTopTab: TopTab;
  studioMode: StudioMode;
  profiles: string[];
  currentProfile: string;
  autoSaveTime: string;

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
  setActiveTopTab: (tab: TopTab) => void;
  setStudioMode: (mode: StudioMode) => void;
  setCurrentProfile: (profile: string) => void;
  addProfile: (name: string) => void;
  setFilterTab: (tab: FilterTab) => void;
  toggleTaskSelect: (id: number) => void;
  selectAllTasks: (selected: boolean) => void;
  toggleRun: () => void;
  pauseRun: () => void;
  stopRun: () => void;
  retryErrors: () => void;
  retrySelected: () => void;
  deleteSelected: () => void;
  deleteWaiting: () => void;
  cleanDone: () => void;
  deleteTask: (id: number) => void;
  addTask: (name: string, path?: string) => void;
  setCurrentVideoId: (id: number) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setOldSubBlurBox: (box: Partial<BoundingBox>) => void;
  setNewSubBox: (box: Partial<BoundingBox>) => void;
  updateSettings: (settings: Partial<BatchSettings>) => void;
  addLog: (message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  setAddVideoModalOpen: (open: boolean) => void;
  setCookieModalOpen: (open: boolean) => void;
  setTranslationConfigOpen: (open: boolean) => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  activeTopTab: 'PRO AUTOMATION',
  studioMode: 'REUP',
  profiles: ['Mặc định', 'Truyện Đô Thị Fast', 'Reup Review Douyin', 'Shorts Anime & Manhua'],
  currentProfile: 'Mặc định',
  autoSaveTime: '11:31:09',

  tasks: [
    {
      id: 1,
      name: '17',
      stage: 'Hoàn tất',
      progress: 100,
      status: 'DONE',
      note: 'Render hoàn tất không lỗi',
      outputPath: 'C:\\Output\\Reup_17.mp4',
      selected: false,
    },
    {
      id: 2,
      name: '18',
      stage: 'Hoàn tất',
      progress: 100,
      status: 'DONE',
      note: 'Render hoàn tất không lỗi',
      outputPath: 'C:\\Output\\Reup_18.mp4',
      selected: false,
    },
    {
      id: 3,
      name: '19',
      stage: 'Hoàn tất',
      progress: 100,
      status: 'DONE',
      note: 'Render hoàn tất không lỗi',
      outputPath: 'C:\\Output\\Reup_19.mp4',
      selected: false,
    },
    {
      id: 4,
      name: '20',
      stage: 'Lấy phụ đề',
      progress: 28,
      status: 'SUBTITLE',
      note: 'Đang trích xuất audio & chạy Whisper...',
      outputPath: 'C:\\Output\\Reup_20.mp4',
      selected: true,
    },
    {
      id: 5,
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
  isRunning: true,
  isPaused: false,
  globalProgress: {
    processed: 4,
    total: 5,
    percent: 80,
    estimatedTime: '7m 37s',
  },

  currentVideoId: 1, // Video 17
  isPlaying: false,
  currentTime: 0,
  duration: 268, // 04:28

  // Bounding boxes in percentage of video container
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

  setActiveTopTab: (tab) => set({ activeTopTab: tab }),
  setStudioMode: (mode) => set({ studioMode: mode }),
  setCurrentProfile: (profile) => set({ currentProfile: profile }),
  addProfile: (name) => {
    if (!name.trim()) return;
    set((state) => ({
      profiles: [...state.profiles, name],
      currentProfile: name,
    }));
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

  toggleRun: () => {
    const isRunning = !get().isRunning;
    set({ isRunning, isPaused: false });
    get().addLog(
      isRunning ? '▶ Đã kích hoạt chế độ TỰ ĐỘNG CHẠY hàng đợi.' : '⏹ Đã dừng tự động chạy.',
      isRunning ? 'info' : 'warn'
    );
  },

  pauseRun: () => {
    const isPaused = !get().isPaused;
    set({ isPaused });
    get().addLog(isPaused ? '⏸ Tạm dừng xử lý hàng đợi.' : '▶ Tiếp tục xử lý hàng đợi.', 'warn');
  },

  stopRun: () => {
    set({ isRunning: false, isPaused: false });
    get().addLog('⏹ Đã hủy toàn bộ quy trình đang chạy.', 'error');
  },

  retryErrors: () => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.status === 'ERROR' ? { ...t, status: 'WAITING', progress: 0, stage: 'Chờ chạy' } : t
      ),
    }));
    get().addLog('⟳ Đã đưa các tác vụ lỗi về trạng thái chờ chạy.', 'info');
  },

  retrySelected: () => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.selected ? { ...t, status: 'WAITING', progress: 0, stage: 'Chờ chạy' } : t
      ),
    }));
    get().addLog('⟳ Đã đưa các mục đã chọn về trạng thái chờ chạy.', 'info');
  },

  deleteSelected: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => !t.selected),
    }));
    get().addLog('Đã xóa các mục đã chọn khỏi hàng đợi.', 'warn');
  },

  deleteWaiting: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== 'WAITING'),
    }));
    get().addLog('Đã xóa các mục đang chờ khỏi hàng đợi.', 'warn');
  },

  cleanDone: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== 'DONE'),
    }));
    get().addLog('Đã dọn dẹp các tác vụ đã hoàn tất.', 'info');
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
    get().addLog(`Đã xóa video #${id} khỏi danh sách.`, 'warn');
  },

  addTask: (name, path) => {
    const newId = Date.now();
    const newTask: TaskItem = {
      id: newId,
      name: name || `Video_${newId.toString().slice(-4)}`,
      stage: 'Chờ chạy',
      progress: 0,
      status: 'WAITING',
      note: 'Vừa thêm vào hàng đợi',
      outputPath: path || `C:\\Output\\Reup_${name}.mp4`,
      selected: false,
    };
    set((state) => ({
      tasks: [...state.tasks, newTask],
      globalProgress: {
        ...state.globalProgress,
        total: state.tasks.length + 1,
      },
    }));
    get().addLog(`+ Đã thêm video "${newTask.name}" vào hàng đợi.`, 'info');
  },

  setCurrentVideoId: (id) => set({ currentVideoId: id }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),

  setOldSubBlurBox: (box) =>
    set((state) => ({
      oldSubBlurBox: { ...state.oldSubBlurBox, ...box },
    })),

  setNewSubBox: (box) =>
    set((state) => ({
      newSubBox: { ...state.newSubBox, ...box },
    })),

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
      autoSaveTime: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    })),

  addLog: (message, type = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      message,
      type,
    };
    set((state) => ({
      logs: [...state.logs.slice(-60), newLog],
    }));
  },

  setAddVideoModalOpen: (open) => set({ isAddVideoModalOpen: open }),
  setCookieModalOpen: (open) => set({ isCookieModalOpen: open }),
  setTranslationConfigOpen: (open) => set({ isTranslationConfigOpen: open }),
}));
