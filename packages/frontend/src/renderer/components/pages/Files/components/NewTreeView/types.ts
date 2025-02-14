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

export interface DatabaseData {
  _id: string;
  id: string;
  file_name: string;
  kind: string;
  date_uploaded: string;
  file_size: string;
  file_path: string;
  file_type: string;
  shared_with: string[];
  is_public: boolean;
  deviceID: string;
  device_name: string;
  helpers: number;
  available: string;
  file_parent: string;
  children?: DatabaseData[];
  original_device: string;
  global_file_path?: string;
  setGlobal_file_path?: (path: string) => void;
} 