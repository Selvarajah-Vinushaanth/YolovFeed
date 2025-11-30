export interface Camera {
  id: string;  // Changed from number to string for Firestore
  name: string;
  ip_address: string;
  port: number;
  is_active: boolean;
  created_at: string;
  location?: string; // Optional location field
}

export interface Detection {
  class_name?: string; // Made optional for safety
  confidence?: number; // Made optional for safety
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
  };
}

export interface ObjectCount {
  [className: string]: number;
}

export interface AnalyticsData {
  object_counts: ObjectCount;
  timestamp: string;
}

export interface CameraStream {
  camera_id: string;  // Changed from number to string
  frame: string; // Base64 encoded image
  timestamp: string;
}

export interface DetectionResult {
  camera_id: string;  // Changed from number to string
  detections: Detection[];
  object_counts: ObjectCount;
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'frame' | 'detection' | 'detection_status' | 'pong';
  camera_id?: string;  // Changed from number to string
  frame?: string;
  detections?: Detection[];
  object_counts?: ObjectCount;
  enabled?: boolean;
  timestamp?: string;
}

export interface AddCameraForm {
  name: string;
  ip_address: string;
  port: number;
}

export interface CameraStatus {
  [cameraId: string]: {  // Changed from number to string
    isStreaming: boolean;
    isDetecting: boolean;
    lastSeen: string;
    error?: string;
  };
}

export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp: string;
}

// New interfaces for LLM Assistant
export interface ChatMessage {
  message: string;
  camera_id?: string;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

export interface ChatHistoryItem {
  userMessage?: string;
  user_message?: string;
  aiResponse?: string;
  ai_response?: string;
  timestamp: string;
  camera_id?: string;
}