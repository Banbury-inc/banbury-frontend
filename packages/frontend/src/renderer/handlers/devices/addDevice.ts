import axios from 'axios';
import * as DateUtils from '../../../../../core/src/utils/dateUtils';
import banbury from '@banbury/core';

export async function addDevice(username: string) {


  const user = username;
  const device_number = 1;
  const device_name = banbury.device.name();
  const storage_capacity_GB = await banbury.device.storage_capacity();
  const max_storage_capacity_GB = 50;
  const date_added = DateUtils.get_current_date_and_time();
  const ip_address = await banbury.device.ip_address();
  const gpu_usage = await banbury.device.gpu_usage();
  const cpu_usage = await banbury.device.cpu_usage();
  const ram_usage = await banbury.device.ram_usage();
  const ram_total = await banbury.device.ram_total();
  const ram_free = await banbury.device.ram_free();
  const device_priority = 1;
  const sync_status = false;
  const optimization_status = false;
  const online = true;

  try {
    const url = `${banbury.config.url}/devices/add_device/${username}/${device_name}/`;
    const response = await axios.post<{ result: string; username: string; }>(url, {
      user: user,
      device_number: device_number,
      device_name: device_name,
      storageCapacityGB: storage_capacity_GB,
      maxStorageCapacityGB: max_storage_capacity_GB,
      date_added: date_added,
      ip_address: ip_address,
      upload_network_speed: 0,
      download_network_speed: 0,
      gpu_usage: gpu_usage,
      cpu_usage: cpu_usage,
      ram_usage: ram_usage,
      ram_total: ram_total,
      ram_free: ram_free,
      device_priority: device_priority,
      sync_status: sync_status,
      optimization_status: optimization_status,
      online: online,
    });
    const result = response.data.result;

    if (result === 'success') {
      console.log("device add_success");
      return 'success';
    }
    if (result === 'fail') {
      console.log("device_add failed");
      return 'failed';
    }
    if (result === 'device_already_exists') {
      console.log("device already exists");
      return 'exists';
    }

    else {
      console.log("device_add failed");
      console.log(result);
      return 'device_add failed';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

