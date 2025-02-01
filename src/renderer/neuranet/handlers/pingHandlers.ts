import * as net from 'net';

import * as DateUtils from '../../utils/dateUtils';
import { DeviceInfo as DeviceInfoType } from '../../types/deviceTypes'; // Assuming DeviceInfoType is defined in a types file
import { SmallDeviceInfo as SmallDeviceInfoType } from '../../types/deviceTypes'; // Assuming DeviceInfoType is defined in a types file
import { neuranet } from '../../neuranet'

export async function small_ping_request(username: string, senderSocket: net.Socket): Promise<void> {
  console.log("received small ping request");
  // Handle ping request
  const user = username;
  // let user = Object.keys(credentials)[0];
  const device_number = 0;
  const device_name = neuranet.device.name();
  const files = await neuranet.device.directory_info();
  const date_added = DateUtils.get_current_date_and_time();

  const device_info_json: SmallDeviceInfoType = {
    user,
    device_number,
    device_name,
    files,
    date_added,
  };

  await neuranet.networking.send_small_device_info(senderSocket, device_info_json);

}

export async function ping_request(username: string, senderSocket: net.Socket): Promise<void> {

  const user = username;
  const device_number = 1;
  const device_name = neuranet.device.name();
  const files = await neuranet.device.directory_info();
  const storage_capacity_GB = await neuranet.device.storage_capacity();
  const max_storage_capacity_GB = 50;
  const date_added = DateUtils.get_current_date_and_time();
  const ip_address = await neuranet.device.ip_address();
  const average_network_speed = 0;
  const upload_network_speed = 0;
  const download_network_speed = 0;
  const gpu_usage = await neuranet.device.gpu_usage();
  const cpu_usage = await neuranet.device.cpu_usage();
  const ram_usage = await neuranet.device.ram_usage();
  const ram_total = await neuranet.device.ram_total();
  const ram_free = await neuranet.device.ram_free();
  const predicted_upload_network_speed = 0;
  const predicted_download_network_speed = 0;
  const predicted_gpu_usage = 0;
  const predicted_cpu_usage = 0;
  const predicted_ram_usage = 0;
  const predicted_performance_score = 0;
  const network_reliability = 0;
  const average_time_online = 0;
  const tasks = 0;
  const device_priority = 1;
  const sync_status = true;
  const optimization_status = true;
  const online = true;

  const device_info_json: DeviceInfoType = {
    user,
    device_number,
    device_name,
    files,
    storage_capacity_GB,
    max_storage_capacity_GB,
    date_added,
    ip_address,
    average_network_speed,
    upload_network_speed,
    download_network_speed,
    gpu_usage,
    cpu_usage,
    ram_usage,
    ram_total,
    ram_free,
    predicted_upload_network_speed,
    predicted_download_network_speed,
    predicted_gpu_usage,
    predicted_cpu_usage,
    predicted_ram_usage,
    predicted_performance_score,
    network_reliability,
    average_time_online,
    tasks,
    device_priority,
    sync_status,
    optimization_status,
    online
  };

  await neuranet.networking.send_device_info(senderSocket, device_info_json);
  console.log("completed ping request");
}

