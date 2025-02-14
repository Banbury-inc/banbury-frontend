export interface FileData {
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