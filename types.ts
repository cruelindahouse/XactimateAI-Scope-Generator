
export enum ActivityCode {
  REMOVE = '-',
  REPLACE = '+',
  DETACH_RESET = '&'
}

export type ScopePhase = 'mitigation' | 'reconstruction' | 'full';
export type JobType = 'R' | 'E';

export interface LineItem {
  id: string;
  category: string; // e.g., "WTR"
  selector: string; // e.g., "DHM"
  code: string;     // Combined "WTR DHM"
  description: string;
  activity: ActivityCode | string;
  quantity: number; // Numeric estimation for totals
  quantity_inference: string; // Raw inference e.g. "Full Room"
  unit: string; // e.g., "EA", "SF"
  reasoning?: string; // AI reasoning for audit
  confidence?: 'High' | 'Medium' | 'Low';
}

export interface RoomData {
  id: string;
  name: string; // inferred name
  timestamp_in?: string;
  timestamp_out?: string;
  dimensions_estimated?: string;
  narrative_synthesis: string; // Visual + Audio synthesis
  flagged_issues: string[];
  items: LineItem[];
}

export interface ProjectMetadata {
  loss_type_inference: string;
  severity_score: number; // 1-10
  confidence_level: 'High' | 'Medium' | 'Low';
}

// New Interface for Client-Side Extracted Media
export interface ExtractedData {
  frames: string[]; // Array of Base64 JPEGs
  audio: string | null; // Base64 WAV (16kHz Mono)
  duration: number;
}

export interface ProjectData {
  description: string;
  images: string[]; // Base64 strings
  videoData?: ExtractedData | null;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}