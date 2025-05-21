// Update the interface to match device data
export interface DeviceData {
  _id: string;
  id: number;
  device_name: string;
  device_manufacturer: string;
  device_model: string;
  storage_capacity_gb: string;
  total_storage: string;
  upload_speed: number | string;  // Changed to allow both number and string
  download_speed: number | string;  // Changed to allow both number and string
  battery_status: string;
  battery_time_remaining: string;
  available: string;
  cpu_info_manufacturer: string;
  cpu_info_brand: string;
  cpu_info_speed: string;
  cpu_info_cores: string;
  cpu_info_physical_cores: string;
  cpu_info_processors: string;
  cpu_info_socket: string;
  cpu_info_vendor: string;
  cpu_info_family: string;
  cpu_usage: string;
  gpu_usage: string[];  // Change from string to string[]
  ram_usage: string;
  ram_total: string;
  ram_free: string;
  scanned_folders: string[];
  downloaded_models: string[];
  predicted_cpu_usage: number;
  predicted_ram_usage: number;
  predicted_gpu_usage: number;
  predicted_download_speed: number;
  predicted_upload_speed: number;
  files_available_for_download: number;
  files_needed: number;
  sync_storage_capacity_gb: number;
  predicted_performance_score: number;
  use_device_in_file_sync: boolean;
  use_predicted_cpu_usage: boolean;
  use_predicted_download_speed: boolean;
  use_predicted_gpu_usage: boolean;
  use_predicted_ram_usage: boolean;
  use_predicted_upload_speed: boolean;
  use_files_available_for_download: boolean;
  use_files_needed: boolean;
}
