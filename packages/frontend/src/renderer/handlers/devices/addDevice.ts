import axios from 'axios';
import * as DateUtils from '../../../../../core/src/utils/dateUtils';
import banbury from '@banbury/core';

export async function addDevice(username: string) {
  try {
    if (!username) {
      throw new Error('Username is required');
    }

    const device_name = banbury.device.name();
    const storage_capacity_GB = await banbury.device.storage_capacity();
    const ip_address = await banbury.device.ip_address();
    const gpu_usage = await banbury.device.gpu_usage();
    const cpu_usage = await banbury.device.cpu_usage();
    const ram_usage = await banbury.device.ram_usage();
    const ram_total = await banbury.device.ram_total();
    const ram_free = await banbury.device.ram_free();

    const deviceData = {
      user: username,
      device_number: 1,
      device_name: device_name,
      storageCapacityGB: storage_capacity_GB,
      maxStorageCapacityGB: 50,
      date_added: DateUtils.get_current_date_and_time(),
      ip_address: ip_address,
      upload_network_speed: 0,
      download_network_speed: 0,
      gpu_usage: gpu_usage,
      cpu_usage: cpu_usage,
      ram_usage: ram_usage,
      ram_total: ram_total,
      ram_free: ram_free,
      device_priority: 1,
      sync_status: false,
      optimization_status: false,
      online: true,
    };

    // Use the correct URL format as shown in the Django URLconf
    const url = `${banbury.config.url}/devices/add_device/${encodeURIComponent(username)}/${encodeURIComponent(device_name)}/`;

    const response = await axios.post(url, deviceData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });


    if (response.data.result === 'success') {
      return 'success';
    } else if (response.data.result === 'device_already_exists') {
      return 'exists';
    } else {
      return 'failed';
    }
  } catch (error: any) {
    console.error('Error adding device:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

