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
  Kind: string;
}

export type DeviceData = {
  user: string;
  device_number: number;
  device_name: string;
  storageCapacityGB: number;
  device_manufacturer: string;
  device_model: string;
  device_version: string;
  services: any;
  cpu_info_brand: string;
  cpu_info_cores: number;
  cpu_info_processors: number;
  cpu_info_physicalCores: number;
  maxStorageCapacityGB: number;
  date_added: string;
  ip_address: string;
  mac_address: string;
  device_priority: number;
  sync_status: boolean;
  optimization_status: boolean;
  online: boolean;
};