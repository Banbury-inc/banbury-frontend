export interface DeviceInfo {
  user: string;
  device_number: number;
  device_name: string;
  files: FileInfo[];
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
  files: FileInfo[];
  date_added: string;
}

export interface FileInfo {
  File_Type: string;
  File_Name: string;
  File_Path: string;
  Date_Uploaded: string;
  Date_Modified: string;
  File_Size: number;
  File_Priority: number;
  File_Parent: string;
  Original_Device: string;
  Device_ID: string;
  Kind: string;
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

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  username: string;
  email?: string;
  avatar_url?: string;
}