export type TopTab = 'PRO AUTOMATION' | 'VOICE STUDIO' | 'REUP STUDIO' | 'QUẢN LÝ KÊNH' | 'Trang chủ';

export type StudioMode = 'TRUYEN_AUDIO' | 'REUP';

export type TaskStatus = 'DONE' | 'SUBTITLE' | 'WAITING' | 'ERROR' | 'CANCELED' | 'PROCESSING';

export interface TaskItem {
  id: number;
  name: string;
  stage: string;
  progress: number;
  status: TaskStatus;
  note: string;
  outputPath: string;
  selected: boolean;
}

export type FilterTab = 'ALL' | 'WAITING' | 'PROCESSING' | 'DONE' | 'ERROR' | 'CANCELED';

export interface BoundingBox {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface BatchSettings {
  genre: string;
  translationQuality: string;
  voice: string;
  speed: number;
  voiceVolume: number;
  originalAudioVolume: number;
  subCoverMethod: string;
  blurRadius: number;
  subTemplate: string;
  fontSize: number;
  textColor: string;
  strokeColor: string;
}
