import type { TaskItem, BatchSettings, BoundingBox, StudioProfile } from '../types';

export const BRIDGE_URL = 
  (typeof window !== 'undefined' && (window as any).__BRIDGE_URL__) ||
  `http://${(typeof window !== 'undefined' && window.location.hostname) || '127.0.0.1'}:5678`;

// Detect whether running in Tauri desktop environment
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

// Event emitter registry for bridge
type EventHandler = (payload: any) => void;
const eventHandlers: Record<string, EventHandler[]> = {};
let sseConnection: EventSource | null = null;

function ensureSSE() {
  if (typeof window === 'undefined' || sseConnection) return;
  try {
    sseConnection = new EventSource(`${BRIDGE_URL}/api/events`);
    
    sseConnection.addEventListener('task-progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        const handlers = eventHandlers['task-progress'] || [];
        handlers.forEach((h) => h(data));
      } catch (err) {
        console.warn('Error parsing task-progress event:', err);
      }
    });

    sseConnection.addEventListener('live-log', (e) => {
      try {
        const data = JSON.parse(e.data);
        const handlers = eventHandlers['live-log'] || [];
        handlers.forEach((h) => h(data));
      } catch (err) {
        console.warn('Error parsing live-log event:', err);
      }
    });

    sseConnection.onerror = () => {
      // Reconnect automatically handled by browser EventSource
    };
  } catch (err) {
    console.warn('[Bridge SSE Init]', err);
  }
}

// Event listener wrapper
export async function listenTauriEvent<T>(
  event: string,
  handler: (payload: T) => void
): Promise<(() => void) | null> {
  if (isTauri()) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      return await listen<T>(event, (e) => handler(e.payload));
    } catch {
      // fallback to SSE below
    }
  }

  // HTTP SSE fallback
  ensureSSE();
  if (!eventHandlers[event]) {
    eventHandlers[event] = [];
  }
  eventHandlers[event].push(handler);

  return () => {
    eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
  };
}

// Safe invoke wrapper
export async function invokeCommand<T>(cmd: string, args: Record<string, any> = {}): Promise<T | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await invoke<T>(cmd, args);
      if (res !== null && res !== undefined) return res;
    } catch {
      // Fallback to local HTTP server below
    }
  }

  // Fallback to local HTTP Bridge server on port 5678
  try {
    if (cmd === 'get_tasks') {
      const res = await fetch(`${BRIDGE_URL}/api/tasks`);
      return (await res.json()) as T;
    }
    if (cmd === 'add_tasks') {
      const res = await fetch(`${BRIDGE_URL}/api/add_tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: args.items || [] }),
      });
      return (await res.json()) as T;
    }
    if (cmd === 'start_queue') {
      const res = await fetch(`${BRIDGE_URL}/api/queue/start`, { method: 'POST' });
      return (await res.json()) as T;
    }
    if (cmd === 'pause_queue') {
      const res = await fetch(`${BRIDGE_URL}/api/queue/pause`, { method: 'POST' });
      return (await res.json()) as T;
    }
    if (cmd === 'cancel_queue') {
      const res = await fetch(`${BRIDGE_URL}/api/queue/cancel`, { method: 'POST' });
      return (await res.json()) as T;
    }
    if (cmd === 'clean_done_tasks') {
      const res = await fetch(`${BRIDGE_URL}/api/queue/clean_done`, { method: 'POST' });
      return (await res.json()) as T;
    }
    if (cmd === 'delete_selected_tasks') {
      const res = await fetch(`${BRIDGE_URL}/api/queue/delete_selected`, { method: 'POST' });
      return (await res.json()) as T;
    }
    if (cmd === 'delete_waiting_tasks') {
      const res = await fetch(`${BRIDGE_URL}/api/queue/delete_waiting`, { method: 'POST' });
      return (await res.json()) as T;
    }
    if (cmd === 'retry_failed_tasks') {
      const res = await fetch(`${BRIDGE_URL}/api/queue/retry_failed`, { method: 'POST' });
      return (await res.json()) as T;
    }
    if (cmd === 'delete_task') {
      const res = await fetch(`${BRIDGE_URL}/api/delete_task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: args.id }),
      });
      return (await res.json()) as T;
    }
    if (cmd === 'open_output_folder') {
      await fetch(`${BRIDGE_URL}/api/open_folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: args.path || '' }),
      });
      return null;
    }
    if (cmd === 'open_file') {
      await fetch(`${BRIDGE_URL}/api/open_file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: args.path }),
      });
      return null;
    }
    if (cmd === 'detect_sub') {
      const res = await fetch(`${BRIDGE_URL}/api/detect_sub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath: args.videoPath || '' }),
      });
      return (await res.json()) as T;
    }
    if (cmd === 'save_current_settings') {
      await fetch(`${BRIDGE_URL}/api/save_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.settings || {}),
      });
      return null;
    }
    if (cmd === 'load_profiles') {
      const res = await fetch(`${BRIDGE_URL}/api/profiles`);
      return (await res.json()) as T;
    }
  } catch (err) {
    console.warn(`[Local Bridge Error] ${cmd}:`, err);
  }

  return null;
}

// ==================== PROFILE APIS ====================
export async function apiLoadProfiles(): Promise<StudioProfile[] | null> {
  return await invokeCommand<StudioProfile[]>('load_profiles');
}

export async function apiSaveProfile(profile: StudioProfile): Promise<string | null> {
  return await invokeCommand<string>('save_profile', { profile });
}

export async function apiDeleteProfile(name: string): Promise<string | null> {
  return await invokeCommand<string>('delete_profile', { name });
}

export async function apiSaveCurrentSettings(
  settings: BatchSettings,
  oldBox: BoundingBox,
  newBox: BoundingBox,
  geminiKey: string,
  groqKey: string,
  douyinCookie: string,
  outputDir: string
): Promise<string | null> {
  const payload = {
    genre: settings.genre,
    translation_quality: settings.translationQuality,
    voice: settings.voice,
    speed: settings.speed,
    voice_volume: settings.voiceVolume,
    original_audio_volume: settings.originalAudioVolume,
    sub_cover_method: settings.subCoverMethod,
    blur_radius: settings.blurRadius,
    sub_template: settings.subTemplate,
    font_size: settings.fontSize,
    text_color: settings.textColor,
    stroke_color: settings.strokeColor,
    render_engine: settings.renderEngine || 'FFmpeg Siêu Tốc (Chạy ngầm 100%)',
    ai_engine_mode: settings.aiEngineMode || 'CLOUD_LOCAL',
    capcut_account_type: settings.capcutAccountType || 'FREE',
    capcut_vip_voice: settings.capcutVipVoice || 'Cô Gái Hoạt Ngôn',
    capcut_sync_speed: settings.capcutSyncSpeed !== false,
    capcut_draft_dir: settings.capcutDraftDir || '',
    capcut_exe_path: settings.capcutExePath || '',
    old_sub_blur_box: oldBox,
    new_sub_box: newBox,
    gemini_api_key: geminiKey,
    groq_api_key: groqKey,
    douyin_cookie: douyinCookie,
    output_dir: outputDir,
    anti_copyright: settings.antiCopyright,
  };
  return await invokeCommand<string>('save_current_settings', { settings: payload });
}

// ==================== QUEUE APIS ====================
export async function apiGetTasks(): Promise<TaskItem[] | null> {
  return await invokeCommand<TaskItem[]>('get_tasks');
}

export async function apiAddTasks(items: string[]): Promise<TaskItem[] | null> {
  return await invokeCommand<TaskItem[]>('add_tasks', { items });
}

export async function apiStartQueue(): Promise<boolean | null> {
  return await invokeCommand<boolean>('start_queue');
}

export async function apiPauseQueue(): Promise<boolean | null> {
  return await invokeCommand<boolean>('pause_queue');
}

export async function apiCancelQueue(): Promise<boolean | null> {
  return await invokeCommand<boolean>('cancel_queue');
}

export async function apiRetryFailed(): Promise<number | null> {
  return await invokeCommand<number>('retry_failed_tasks');
}

export async function apiRetrySelected(ids: number[]): Promise<number | null> {
  return await invokeCommand<number>('retry_selected_tasks', { ids });
}

export async function apiDeleteSelected(ids: number[]): Promise<number | null> {
  return await invokeCommand<number>('delete_selected_tasks', { ids });
}

export async function apiDeleteWaiting(): Promise<number | null> {
  return await invokeCommand<number>('delete_waiting_tasks');
}

export async function apiCleanDone(): Promise<number | null> {
  return await invokeCommand<number>('clean_done_tasks');
}

export async function apiDeleteTask(id: number): Promise<boolean | null> {
  return await invokeCommand<boolean>('delete_task', { id });
}

export async function apiOpenOutputFolder(path?: string): Promise<void> {
  await invokeCommand('open_output_folder', { path });
}

export async function apiOpenFile(path: string): Promise<void> {
  await invokeCommand('open_file', { path });
}

export async function apiDetectSub(videoPath?: string): Promise<BoundingBox | null> {
  return await invokeCommand<BoundingBox>('detect_sub', { videoPath });
}

export async function apiUploadVideoFile(file: File): Promise<any> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/upload?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      body: file,
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to upload video file:', err);
    return null;
  }
}

export async function apiAddLocalPath(path: string): Promise<any> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/add_local_path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to add local path:', err);
    return null;
  }
}

export async function apiTestApiKey(type: 'gemini' | 'groq', key: string): Promise<any> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/test_api_key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, key }),
    });
    return await res.json();
  } catch (err: any) {
    return { valid: false, message: err?.message || 'Không thể kết nối đến máy chủ bridge' };
  }
}

export async function apiSelectFolder(): Promise<string | null> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/select_folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.status === 'success' && data.folder) {
      return data.folder;
    }
    return null;
  } catch (err) {
    console.error('Failed to select folder:', err);
    return null;
  }
}

export interface CapcutStatus {
  is_running: boolean;
  screen_state: 'EDITOR' | 'HOME' | 'CLOSED';
  window_title: string;
  exe_installed: boolean;
  exe_path: string;
}

export async function apiGetCapcutStatus(): Promise<CapcutStatus> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/capcut_status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore
  }
  return {
    is_running: false,
    screen_state: 'CLOSED',
    window_title: '',
    exe_installed: false,
    exe_path: '',
  };
}

export interface VoiceOption {
  value: string;
  label: string;
  gender?: string;
  locale?: string;
  source?: string;
}

export async function apiGetVoices(): Promise<{ free_voices: VoiceOption[]; pro_voices: VoiceOption[] }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/voices`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore
  }
  return { free_voices: [], pro_voices: [] };
}
