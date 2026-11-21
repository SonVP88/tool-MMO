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
  LiveLogEvent,
  CharacterMapping
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
  apiUploadVideoFile,
  apiAddLocalPath,
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
  isCapCutConfigOpen: boolean;
  isCharacterModalOpen: boolean;
  isDependencyDoctorOpen: boolean;

  // Characters & Multi-Speaker Mapping
  characters: CharacterMapping[];

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
  uploadVideoFiles: (files: File[]) => Promise<void>;
  addLocalPath: (path: string) => Promise<void>;
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
  setCapCutConfigOpen: (open: boolean) => void;
  setCharacterModalOpen: (open: boolean) => void;
  setDependencyDoctorOpen: (open: boolean) => void;
  setCharacters: (chars: CharacterMapping[]) => void;
  triggerAutoSave: () => Promise<void>;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  activeTopTab: 'PRO AUTOMATION',
  studioMode: 'REUP',
  profiles: ['Mặc định', 'Truyện Đô Thị Fast', 'Reup Review Douyin', 'Shorts Anime & Manhua'],
  currentProfile: 'Mặc định',
  autoSaveTime: new Date().toLocaleTimeString('vi-VN', { hour12: false }),

  geminiApiKey: '',
  groqApiKey: '',
  douyinCookie: '',
  outputDir: '',

  isAddVideoModalOpen: false,
  isCookieModalOpen: false,
  isTranslationConfigOpen: false,
  isCapCutConfigOpen: false,
  isCharacterModalOpen: false,
  isDependencyDoctorOpen: false,

  characters: (() => {
    try {
      const saved = localStorage.getItem('studio_characters');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  })(),

  tasks: [],

  filterTab: 'ALL',
  isRunning: false,
  isPaused: false,
  globalProgress: {
    processed: 0,
    total: 0,
    percent: 0,
    estimatedTime: '0s',
  },

  currentVideoId: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,

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
    renderEngine: 'FFmpeg Siêu Tốc (Chạy ngầm 100%)',
    aiEngineMode: 'CLOUD_LOCAL',
    capcutAccountType: 'FREE',
    capcutVipVoice: 'Cô Gái Hoạt Ngôn',
    capcutSyncSpeed: true,
    capcutDraftDir: '%LOCALAPPDATA%\\CapCut\\User Data\\Projects\\com.lveditor.draft',
    capcutExePath: '%LOCALAPPDATA%\\CapCut\\Apps\\CapCut.exe',
    audioFilterMode: 'vocal_cut',
    audioDenoise: true,
    antiCopyright: {
      flipHorizontal: true,
      cropZoom: 104,
      brightness: 2,
      contrast: 1.05,
      saturation: 1.10,
      noiseOverlay: 2,
      watermarkPath: '',
      introPath: '',
      outroPath: '',
      stripMetadata: true,
      randomizeMd5: true,
    },
  },

  logs: [
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      message: 'Khởi tạo hệ thống Automation Studio hoàn tất. Sẵn sàng xử lý.',
      type: 'info',
    },
  ],

  initApp: async () => {
    // 1. Load profiles from backend
    const profiles = await apiLoadProfiles();
    if (profiles && profiles.length > 0) {
      set({
        profiles: profiles.map((p) => p.name),
        currentProfile: profiles[0].name,
      });
    }

    // 1b. Load settings from backend
    try {
      const res = await fetch('http://127.0.0.1:5678/api/settings');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg) {
          if (cfg.gemini_api_key || cfg.geminiApiKey) {
            set({ geminiApiKey: cfg.gemini_api_key || cfg.geminiApiKey });
          }
          if (cfg.groq_api_key || cfg.groqApiKey) {
            set({ groqApiKey: cfg.groq_api_key || cfg.groqApiKey });
          }
          if (cfg.output_dir || cfg.outputDir) {
            set({ outputDir: cfg.output_dir || cfg.outputDir });
          }
          if (cfg.old_sub_blur_box || cfg.oldSubBlurBox) {
            set({ oldSubBlurBox: cfg.old_sub_blur_box || cfg.oldSubBlurBox });
          }
          if (cfg.new_sub_box || cfg.newSubBox) {
            set({ newSubBox: cfg.new_sub_box || cfg.newSubBox });
          }
          // Restore CapCut & Render Engine settings
          set((state) => ({
            settings: {
              ...state.settings,
              renderEngine: cfg.render_engine || cfg.renderEngine || state.settings.renderEngine,
              aiEngineMode: cfg.ai_engine_mode || cfg.aiEngineMode || state.settings.aiEngineMode,
              capcutAccountType: (cfg.capcut_account_type || cfg.capcutAccountType || state.settings.capcutAccountType || 'FREE') as 'PRO' | 'FREE',
              capcutVipVoice: cfg.capcut_vip_voice || cfg.capcutVipVoice || state.settings.capcutVipVoice,
              capcutSyncSpeed: cfg.capcut_sync_speed !== undefined ? cfg.capcut_sync_speed : state.settings.capcutSyncSpeed,
              capcutDraftDir: cfg.capcut_draft_dir || cfg.capcutDraftDir || state.settings.capcutDraftDir,
              capcutExePath: cfg.capcut_exe_path || cfg.capcutExePath || state.settings.capcutExePath,
            },
          }));
        }
      }
    } catch {
      // ignore
    }

    // 2. Load tasks from backend
    const tasks = await apiGetTasks();
    if (tasks !== null && tasks !== undefined) {
      set({
        tasks,
        currentVideoId: tasks.length > 0 ? tasks[0].id : 0,
        globalProgress: {
          processed: tasks.filter((t) => t.status === 'DONE').length,
          total: tasks.length,
          percent: tasks.length > 0
            ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / tasks.length)
            : 0,
          estimatedTime: tasks.length > 0 ? 'Tự động tính' : '0s',
        },
      });
    }

    // 3. Listen to realtime task-progress events
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

    // 4. Listen to live-log events
    await listenTauriEvent<LiveLogEvent>('live-log', (event) => {
      get().addLog(event.message, event.log_type as any);
    });
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
      get().addLog('▶ Kích hoạt hàng đợi tự động xử lý video thực...', 'info');
      await apiStartQueue();
    } else {
      await apiCancelQueue();
      get().addLog('⏹ Đã dừng hàng đợi.', 'warn');
    }
  },

  pauseRun: async () => {
    const isPaused = !get().isPaused;
    set({ isPaused });
    await apiPauseQueue();
  },

  stopRun: async () => {
    set({ isRunning: false, isPaused: false });
    await apiCancelQueue();
    get().addLog('⏹ Đã hủy toàn bộ quy trình đang chạy.', 'error');
  },

  retryErrors: async () => {
    await apiRetryFailed();
    const updated = await apiGetTasks();
    if (updated) set({ tasks: updated });
    get().addLog('⟳ Đã đưa các tác vụ lỗi về trạng thái chờ chạy.', 'info');
  },

  retrySelected: async () => {
    const selectedIds = get()
      .tasks.filter((t) => t.selected)
      .map((t) => t.id);
    await apiRetrySelected(selectedIds);
    const updated = await apiGetTasks();
    if (updated) set({ tasks: updated });
    get().addLog('⟳ Đã đưa các mục đã chọn về trạng thái chờ chạy.', 'info');
  },

  deleteSelected: async () => {
    const selectedIds = get()
      .tasks.filter((t) => t.selected)
      .map((t) => t.id);
    await apiDeleteSelected(selectedIds);
    const updated = await apiGetTasks();
    if (updated) set({ tasks: updated });
    get().addLog('Đã xóa các mục đã chọn khỏi hàng đợi.', 'warn');
  },

  deleteWaiting: async () => {
    await apiDeleteWaiting();
    const updated = await apiGetTasks();
    if (updated) set({ tasks: updated });
    get().addLog('Đã xóa các mục đang chờ khỏi hàng đợi.', 'warn');
  },

  cleanDone: async () => {
    await apiCleanDone();
    const updated = await apiGetTasks();
    if (updated) set({ tasks: updated });
    get().addLog('Đã dọn dẹp các tác vụ đã hoàn tất.', 'info');
  },

  deleteTask: async (id) => {
    await apiDeleteTask(id);
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
    const updated = await apiAddTasks(items);
    if (updated && updated.length > 0) {
      set({
        tasks: updated,
        globalProgress: {
          ...get().globalProgress,
          total: updated.length,
        },
      });
    } else {
      const baseId = Date.now();
      const newTasks: TaskItem[] = items.map((item, idx) => {
        let taskName = `Video_${baseId + idx}`;
        const ytMatch = item.match(/(?:v=|\/shorts\/|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          taskName = `YouTube_${ytMatch[1]}`;
        } else {
          const clean = item.split(/[?#]/)[0].split(/[\/\\]/).pop()?.replace(/\.[^/.]+$/, '') || '';
          if (clean && !['watch', 'index', 'video', 'play', 'share'].includes(clean.toLowerCase())) {
            taskName = clean;
          }
        }
        return {
          id: baseId + idx,
          name: taskName,
          source: item,
          stage: 'Chờ chạy',
          progress: 0,
          status: 'WAITING',
          note: 'Vừa thêm vào hàng đợi thực',
          outputPath: `${get().outputDir ? `${get().outputDir}/` : ''}Reup_${taskName}.mp4`,
          selected: false,
        };
      });
      set((state) => ({
        tasks: [...state.tasks, ...newTasks],
        globalProgress: {
          ...state.globalProgress,
          total: state.tasks.length + newTasks.length,
        },
      }));
    }
    get().addLog(`+ Đã thêm ${items.length} video vào hàng đợi thực tế.`, 'success');
  },

  uploadVideoFiles: async (files: File[]) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      get().addLog(`Đang tải file (${i + 1}/${files.length}): ${file.name}...`, 'info');
      const res = await apiUploadVideoFile(file);
      if (res && res.tasks) {
        set({ tasks: res.tasks });
      }
    }
    const updated = await apiGetTasks();
    if (updated) {
      set({
        tasks: updated,
        globalProgress: {
          ...get().globalProgress,
          total: updated.length,
        },
      });
    }
    get().addLog(`Đã tải lên và đưa ${files.length} video thực tế vào hàng đợi!`, 'success');
  },

  addLocalPath: async (path: string) => {
    if (!path.trim()) return;
    get().addLog(`Đang quét file từ đường dẫn: ${path}...`, 'info');
    const res = await apiAddLocalPath(path);
    if (res && res.tasks) {
      set({
        tasks: res.tasks,
        globalProgress: {
          ...get().globalProgress,
          total: res.tasks.length,
        },
      });
      get().addLog(`Đã thêm thành công ${res.count || ''} video từ: ${path}`, 'success');
    } else {
      get().addLog(`Không tìm thấy video hợp lệ tại: ${path}`, 'warn');
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
    get().addLog(`Đã đổi thư mục xuất sang: ${dir}`, 'info');
  },

  triggerAutoSave: async () => {
    const now = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    set({ autoSaveTime: now });
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
    const target = path || get().outputDir || '';
    apiOpenOutputFolder(target);
    get().addLog(`Đang mở thư mục xuất: ${target}`, 'info');
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
  setCapCutConfigOpen: (open) => set({ isCapCutConfigOpen: open }),
  setCharacterModalOpen: (open) => set({ isCharacterModalOpen: open }),
  setDependencyDoctorOpen: (open) => set({ isDependencyDoctorOpen: open }),
  setCharacters: (chars) => {
    try {
      localStorage.setItem('studio_characters', JSON.stringify(chars));
      fetch('http://127.0.0.1:5678/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characters: chars }),
      }).catch(() => {});
    } catch {}
    set({ characters: chars });
  },
}));
