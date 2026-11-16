import type { TaskItem, BatchSettings, BoundingBox, StudioProfile } from '../types';

// Detect whether running in Tauri desktop environment
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

// Safe invoke wrapper
export async function invokeCommand<T>(cmd: string, args: Record<string, any> = {}): Promise<T | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (err) {
      console.warn(`[Tauri Invoke Error] ${cmd}:`, err);
      return null;
    }
  }
  return null;
}

// Event listener wrapper
export async function listenTauriEvent<T>(
  event: string,
  handler: (payload: T) => void
): Promise<(() => void) | null> {
  if (isTauri()) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<T>(event, (e) => handler(e.payload));
      return unlisten;
    } catch (err) {
      console.warn(`[Tauri Listen Error] ${event}:`, err);
      return null;
    }
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
    capcut_draft_dir: settings.capcutDraftDir || '',
    capcut_exe_path: settings.capcutExePath || '',
    old_sub_blur_box: oldBox,
    new_sub_box: newBox,
    gemini_api_key: geminiKey,
    groq_api_key: groqKey,
    douyin_cookie: douyinCookie,
    output_dir: outputDir,
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
