export interface FilesTable {
  _id: string;
  device_id: string;
  file_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  date_uploaded: string;
  date_modified: string;
  file_parent: string;
  file_priority: number;
  original_device: string;
  kind: string;
  shared_with: string[];
  is_public: boolean;
}

// Display interface that extends FilesTable with computed/display fields used in the UI
export interface FilesColumns extends FilesTable {
  available: string; // Computed based on device online status
  source: 'files' | 'sync' | 'shared' | 'cloud' | 'google_drive'; // Source context
}

export interface UsersTable {
  id: number;
  devices: string[];
  email?: string;
  first_name: string;
  last_name: string;
  online: string;
  password: string;
  phone_number: string;
  username: string;
  picture?: string;
  google_drive_credentials?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expiry_date: number;
  };
}

export interface NotificationsTable {
  _id: string;
  type: 'friend_request' | 'share' | 'upload' | 'system';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export interface SessionsTable {
  _id: string;
  device_id: string;
  username: string;
  task_name: string;
  task_type: string;
  task_device: string;
  task_status: string;
  task_progress: number;
  task_date_added: string;
  task_date_modified: string;
}

export interface DeviceInfo {
  user: string;
  device_number: number;
  device_name: string;
  files: FilesTable[];
  storage_capacity_GB: number;
  max_storage_capacity_GB: number;
  date_added: string;
  ip_address: string;
  average_network_speed: number;
  upload_network_speed: number;
  download_network_speed: number;
  gpu_usage: number;
  cpu_usage: number;
  ram_usage: number;
  ram_total: number;
  ram_free: number;
  predicted_upload_network_speed: number;
  predicted_download_network_speed: number;
  predicted_gpu_usage: number;
  predicted_cpu_usage: number;
  predicted_ram_usage: number;
  predicted_performance_score: number;
  network_reliability: number;
  average_time_online: number;
  tasks: number;
  device_priority: number;
  sync_status: boolean;
  optimization_status: boolean;
  online: boolean;
}

export interface SmallDeviceInfo {
  user: string;
  device_number: number;
  device_name: string;
  files: FilesTable[];
  date_added: string;
}

export interface FileData {
  _id: string;
  id: string;
  fileType: string;
  fileName: string;
  dateUploaded: string;
  fileSize: string;
  filePath: string;
  fileParent: string;
  kind: string;
  deviceID: string;
  deviceName: string;
  children?: FileData[];
  original_device: string;
  shared_with: string[];
  is_public: boolean;
}

export interface TaskInfo {
  task_id: string;
  task_progress: number;
  task_name: string;
  task_device: string;
  task_status: string;
  fileInfo?: {
    file_name: string;
    file_size: number;
    kind: string;
  }[];
}

export interface FileSyncRequest {
  message_type: 'file_sync_request';
  download_queue: {
    file_name: string;
    file_path: string;
    file_size: number;
    kind: string;
    device_id: string;
  }[];
}

export interface DatabaseData {
  _id?: string;
  id: number | string;
  file_name: string;
  file_path: string;
  file_size: string | number;
  kind: string;
  device_name: string;
  date_uploaded: string;
  available: string;
  file_priority?: number;
  original_device?: string;
  file_type?: string;
  file_parent?: string;
  is_public?: boolean;
  deviceID?: string;
  children?: DatabaseData[];
  helpers?: number;
  shared_with?: string[];
  source?: 'files' | 'sync' | 'shared' | 'cloud' | 'google_drive';
  owner?: string;
  date_modified?: string;
  is_s3?: boolean;
  s3_url?: string;
  device_ids?: string[];
  // Google Drive specific fields
  mime_type?: string;
  web_view_link?: string;
  thumbnail_link?: string;
  parents?: string[];
  google_drive_id?: string;
}

export interface GoogleDriveFileRow {
  id: string;
  file_name: string;
  kind: 'Folder' | 'File';
  file_size: number;
  date_modified?: string;
  date_uploaded?: string;
  mime_type: string;
  web_view_link?: string;
  thumbnail_link?: string;
  parents: string[];
  source: 'google_drive';
  device_name: string;
  available: string;
  file_priority: number;
  is_public: boolean;
  original_device: string;
  file_path: string;
  google_drive_id?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ExtendedChatMessage[];
  category?: string;
}

export interface ChatResponse {
  model: string;
  created_at: Date;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface ExtendedChatMessage extends ChatMessage {
  thinking?: string;
  images?: string[];
  searchInfo?: {
    duration: number;
  };
  agentMode?: boolean;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    images?: string[]; // Base64 encoded images
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  status: 'installed' | 'available';
  configured?: boolean;
  enabled?: boolean;
}

// Add missing type definitions
export interface UserNotification {
  _id: string;
  type: 'friend_request' | 'share' | 'upload' | 'system';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number: string;
  online: string;
  picture?: string;
  devices: string[];
}

export interface FileInfo {
  file_name: string;
  file_path: string;
  file_size: number;
  kind: string;
  device_id: string;
  file_type?: string;
  _id?: string;
}

export type AvailableTableColumns = 'file_name' | 'file_size' | 'kind' | 'original_device' | 'available' | 'file_priority' | 'date_uploaded' | 'date_modified' | 'is_public';