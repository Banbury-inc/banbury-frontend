import axios from 'axios';
import * as DateUtils from '../utils/dateUtils';
import banbury from '..';

export async function addDevice(username: string) {

    const device_name = banbury.device.name();
    const storage_capacity_GB = await banbury.device.storage_capacity();
    const ip_address = await banbury.device.ip_address();
    const device_manufacturer = await banbury.device.device_manufacturer();
    const device_model = await banbury.device.device_model();
    const device_version = await banbury.device.device_version();
    const services = await banbury.device.services();
    const cpu_info_brand = await banbury.device.cpu_info_brand();
    const cpu_info_cores = await banbury.device.cpu_info_cores();
    const cpu_info_processors = await banbury.device.cpu_info_processors();
    const cpu_info_physicalCores = await banbury.device.cpu_info_physicalCores();
    const mac_address = await banbury.device.mac_address();

    const deviceData = {
      user: username,
      device_number: 1,
      device_name: device_name,
      storageCapacityGB: storage_capacity_GB,
      device_manufacturer: device_manufacturer,
      device_model: device_model,
      device_version: device_version,
      services: services,
      cpu_info_brand: cpu_info_brand,
      cpu_info_cores: cpu_info_cores,
      cpu_info_processors: cpu_info_processors,
      cpu_info_physicalCores: cpu_info_physicalCores,
      maxStorageCapacityGB: 50,
      date_added: DateUtils.get_current_date_and_time(),
      ip_address: ip_address,
      mac_address: mac_address,
      device_priority: 1,
      sync_status: false,
      optimization_status: false,
      online: true,
    };

    // Use the correct URL format as shown in the Django URLconf
    const url = `${banbury.config.url}/devices/add_device/${encodeURIComponent(device_name)}/`;

    try {
      const response = await axios.post(url, deviceData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username,
        },
        withCredentials: true
      });

      return response.data;
    } catch (error) {
      console.error('Error in addDevice request:', error);
      return {
        result: 'error',
        message: error instanceof Error ? error.message : 'Network request failed'
      };
    }
}

