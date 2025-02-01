import * as net from "net";

interface DeviceInfo {
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

interface SmallDeviceInfo {
  user: string;
  device_number: number;
  device_name: string;
  files: FileInfo[];
  date_added: string;
}

interface FileInfo {
  File_Type: string;
  File_Name: string;
  Kind: string;
  Date_Uploaded: string;
  File_Size: number;
  File_Priority: number;
  File_Path: string;
  Original_Device: string;
}



export async function send_small_device_info(sender_socket: net.Socket, device_info: SmallDeviceInfo): Promise<void> {
  const file_header: string = "SMALL_PING_REQUEST_RESPONSE::::END_OF_HEADER";
  const device_info_with_stop_signal: string = JSON.stringify(device_info) + "END_OF_JSON";
  const full_message = file_header + device_info_with_stop_signal;
  sender_socket.write(full_message);
}

export async function send_device_info(sender_socket: net.Socket, device_info: DeviceInfo): Promise<void> {
  const null_string: string = "";
  const file_header: string = `PING_REQUEST_RESPONSE:${null_string}:${null_string}:${null_string}:END_OF_HEADER`;
  const device_info_with_stop_signal: string = JSON.stringify(device_info) + "END_OF_JSON";
  const full_message = file_header + device_info_with_stop_signal;
  sender_socket.write(full_message);
  console.log(full_message)
  console.log("ping request response sent to server");
}


