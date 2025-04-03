import axios from 'axios';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { CONFIG } from '../config';
import si from 'systeminformation';

// Disable temperature monitoring to avoid the osx-temperature-sensor dependency
process.env.SYSTEMINFORMATION_DISABLE_TEMPERATURE = 'true';

// Helper function to safely call systeminformation methods
async function safeSystemInfo<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn('System information not available:', error);
    return fallback;
  }
}

interface CPUPerformance {
  manufacturer: string;
  brand: string;
  speed: number;
  cores: number;
  physicalCores: number;
  processors: number;
}


export function name(): string {
  return os.hostname();
}

export function current_time(): string {
  return DateTime.local().toFormat('yyyy-MM-dd HH:mm:ss');
}

export async function system_info(): Promise<string> {
  const fallbackSystemData = {
    manufacturer: 'Unknown',
    model: 'Unknown',
    version: 'Unknown',
    serial: 'Unknown',
    uuid: 'Unknown',
    sku: 'Unknown',
    virtual: false
  };
  
  return JSON.stringify(await safeSystemInfo(() => si.system(), fallbackSystemData));
}

export async function device_manufacturer(): Promise<string> {
  const fallbackSystemData = {
    manufacturer: 'Unknown',
    model: 'Unknown',
    version: 'Unknown',
    serial: 'Unknown',
    uuid: 'Unknown',
    sku: 'Unknown',
    virtual: false
  };
  
  const systemData = await safeSystemInfo(() => si.system(), fallbackSystemData);
  return systemData.manufacturer || 'Unknown';
}

export async function device_model(): Promise<string> {
  const fallbackSystemData = {
    manufacturer: 'Unknown',
    model: 'Unknown',
    version: 'Unknown',
    serial: 'Unknown',
    uuid: 'Unknown',
    sku: 'Unknown',
    virtual: false
  };
  
  const systemData = await safeSystemInfo(() => si.system(), fallbackSystemData);
  return systemData.model || 'Unknown';
}

export async function device_version(): Promise<string> {
  const fallbackSystemData = {
    manufacturer: 'Unknown',
    model: 'Unknown',
    version: 'Unknown',
    serial: 'Unknown',
    uuid: 'Unknown',
    sku: 'Unknown',
    virtual: false
  };
  
  const systemData = await safeSystemInfo(() => si.system(), fallbackSystemData);
  return systemData.version || 'Unknown';
}


export async function services(name?: string): Promise<string> {
  return JSON.stringify(await si.services(name || ''));
}

export async function block_devices(): Promise<string> {
  return JSON.stringify(await si.blockDevices());
}

export async function disk_layout(): Promise<string> {
  return JSON.stringify(await si.diskLayout());
}

export async function fs_size(): Promise<string> {
  return JSON.stringify(await si.fsSize());
}

export async function usb_devices(): Promise<string> {
  if ('usbDevices' in si) {
    return JSON.stringify(await (si as any).usbDevices());
  } else {
    console.warn('USB devices information not available');
    return JSON.stringify([]);
  }
}

export async function storage_capacity(): Promise<number> {
  try {
    const diskData = await si.fsSize();
    const totalCapacityBytes = diskData.reduce((total, disk) => total + disk.size, 0);
    const totalCapacityGB = totalCapacityBytes / (1024 * 1024 * 1024); // Convert bytes to GB
    return totalCapacityGB;
  } catch (error) {
    console.error('Error retrieving storage capacity:', error);
    throw error; // Rethrow error to handle externally
  }
}

export async function cpu_info(): Promise<CPUPerformance> {
  const fallbackCpuData = {
    manufacturer: 'Unknown',
    brand: 'Unknown',
    vendor: 'Unknown',
    family: 'Unknown',
    model: 'Unknown',
    stepping: 'Unknown',
    revision: 'Unknown',
    voltage: 'Unknown',
    speed: 0,
    speedMin: 0,
    speedMax: 0,
    governor: 'Unknown',
    cores: 0,
    physicalCores: 0,
    processors: 0,
    socket: 'Unknown',
    flags: '',
    virtualization: false,
    cache: {
      l1d: 0,
      l1i: 0,
      l2: 0,
      l3: 0
    }
  };
  
  const cpuData = await safeSystemInfo(() => si.cpu(), fallbackCpuData);

  return {
    manufacturer: cpuData.manufacturer || 'Unknown',
    brand: cpuData.brand || 'Unknown',
    speed: cpuData.speed || 0,
    cores: cpuData.cores || 0,
    physicalCores: cpuData.physicalCores || 0,
    processors: cpuData.processors || 0
  };
}

export async function cpu_info_manufacturer(): Promise<string> {
  const cpuData = await si.cpu();
  return cpuData.manufacturer || 'Unknown';
}

export async function cpu_info_brand(): Promise<string> {
  const cpuData = await si.cpu();
  return cpuData.brand || 'Unknown';
}

export async function cpu_info_speed(): Promise<number> {
  const cpuData = await si.cpu();
  return cpuData.speed || 0;
}

export async function cpu_info_cores(): Promise<number> {
  const cpuData = await si.cpu();
  return cpuData.cores || 0;
}

export async function cpu_info_physicalCores(): Promise<number> {
  const cpuData = await si.cpu();
  return cpuData.physicalCores || 0;
}


export async function cpu_info_processors(): Promise<number> {
  const cpuData = await si.cpu();
  return cpuData.processors || 0;
}

export async function cpu_usage(): Promise<number> {
  const fallbackLoadData = {
    avgLoad: 0,
    currentLoad: 0,
    currentLoadUser: 0,
    currentLoadSystem: 0,
    currentLoadNice: 0,
    currentLoadIdle: 0,
    currentLoadIrq: 0,
    currentLoadSteal: 0,
    currentLoadGuest: 0,
    rawCurrentLoad: 0,
    rawCurrentLoadUser: 0,
    rawCurrentLoadSystem: 0,
    rawCurrentLoadNice: 0,
    rawCurrentLoadIdle: 0,
    rawCurrentLoadIrq: 0,
    rawCurrentLoadSteal: 0,
    rawCurrentLoadGuest: 0,
    cpus: []
  };
  
  const cpuData = await safeSystemInfo(() => si.currentLoad(), fallbackLoadData);
  return cpuData.currentLoad || 0;
}

export async function gpu_usage(): Promise<number> {
  const fallbackGraphicsData = {
    controllers: [] as any[],
    displays: []
  };
  
  const gpuData = await safeSystemInfo(() => si.graphics(), fallbackGraphicsData);
  if (!gpuData.controllers || gpuData.controllers.length === 0) {
    return 0;
  }
  const totalUtilization = gpuData.controllers.reduce((total, controller) => total + (controller.utilizationGpu || 0), 0);
  return totalUtilization / gpuData.controllers.length;
}

export async function ram_usage(): Promise<number> {
  const fallbackMemData = {
    total: 0,
    free: 0,
    used: 0,
    active: 0,
    available: 0,
    buffcache: 0,
    buffers: 0,
    cached: 0,
    slab: 0,
    slab_reclaimable: 0,
    slab_unreclaimable: 0,
    shared: 0,
    swaptotal: 0,
    swapused: 0,
    swapfree: 0,
    writeback: 0,
    dirty: 0
  };
  
  const memData = await safeSystemInfo(() => si.mem(), fallbackMemData);
  const totalMemory = memData.total || 0;
  const usedMemory = memData.used || 0;
  const usagePercentage = totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0;
  return isNaN(usagePercentage) ? 0 : usagePercentage;
}
export async function ram_total(): Promise<number> {
  try {
    const memData = await si.mem();
    const totalMemory = memData.total || 0;
    // const usedMemory = memData.used || 0;
    // const freeMemory = memData.free || 0;

    // const usagePercentage = (usedMemory / totalMemory) * 100;

    // const ramUsage: memUsage = {
    //   total: totalMemory,
    //   free: freeMemory,
    //   used: usedMemory,
    //   usagePercentage: isNaN(usagePercentage) ? 0 : usagePercentage // Handle NaN case
    // };

    return isNaN(totalMemory) ? 0 : totalMemory; // Handle NaN case
  } catch (error) {
    console.error('Error retrieving RAM usage:', error);
    throw error; // Rethrow error to handle externally
  }
}
export async function ram_free(): Promise<number> {
  try {
    const memData = await si.mem();
    // const totalMemory = memData.total || 0;
    // const usedMemory = memData.used || 0;
    const freeMemory = memData.free || 0;

    // const usagePercentage = (usedMemory / totalMemory) * 100;

    // const ramUsage: memUsage = {
    //   total: totalMemory,
    //   free: freeMemory,
    //   used: usedMemory,
    //   usagePercentage: isNaN(usagePercentage) ? 0 : usagePercentage // Handle NaN case
    // };

    return isNaN(freeMemory) ? 0 : freeMemory; // Handle NaN case
  } catch (error) {
    console.error('Error retrieving RAM usage:', error);
    throw error; // Rethrow error to handle externally
  }
}

export async function ip_address(): Promise<string> {
  let ip_address: string | null = null;

  try {
    const response = await axios.get('https://httpbin.org/ip');
    const ip_info = response.data;
    const origin: string = ip_info.origin || 'Unknown';
    ip_address = origin.split(',')[0];
  } catch (error) {
    console.error('Error occurred:', error);
    ip_address = 'Unknown';
  }

  return ip_address || 'Unknown';
}

export async function mac_address(): Promise<string> {
  try {
    const networkData = await si.networkInterfaces();
    // Check if networkData is an array and has at least one interface
    if (Array.isArray(networkData) && networkData.length > 0) {
      return networkData[0].mac || 'Unknown';
    }
    return 'Unknown';
  } catch (error) {
    console.error('Error retrieving MAC address:', error);
    return 'Unknown';
  }
}

export async function battery_status(): Promise<number> {
  try {
    const batteryData = await si.battery();
    const batteryStatus = batteryData.percent || 0;
    return batteryStatus;
  } catch (error) {
    console.error('Error retrieving battery status:', error);
    throw error; // Rethrow error to handle externally
  }
}

export async function battery_time_remaining(): Promise<number> {
  try {
    const batteryData = await si.battery();
    return batteryData.timeRemaining || 0;
  } catch (error) {
    console.error('Error retrieving battery time remaining:', error);
    throw error;
  }
}

export async function network_interfaces(): Promise<string> {
  try {
    const networkData = await si.networkInterfaces();
    return JSON.stringify(networkData);
  } catch (error) {
    console.error('Error retrieving network interfaces:', error);
    throw error; // Rethrow error to handle externally
  }
}

export async function network_speed(): Promise<any> {
  try {
    const networkData = await si.networkStats();
    return networkData;
  } catch (error) {
    console.error('Error retrieving network speed:', error);
    throw error; // Rethrow error to handle externally
  }
}

export async function upload_speed(): Promise<number> {
  try {
    const networkData = await si.networkStats();
    return networkData[0].tx_bytes || 0;
  } catch (error) {
    console.error('Error retrieving upload speed:', error);
    throw error; // Rethrow error to handle externally
  }
}

export async function download_speed(): Promise<number> {
  try {
    const networkData = await si.networkStats();
    return networkData[0].rx_bytes || 0;
  } catch (error) {
    console.error('Error retrieving download speed:', error);
    throw error; // Rethrow error to handle externally
  }
}

export async function bluetooth_status(): Promise<boolean> {
  try {
    // @ts-ignore
    if (typeof si.bluetooth === 'function') {
      // @ts-ignore
      const bluetoothData = await si.bluetooth();
      return bluetoothData.connected || false;
    } else {
      console.warn('Bluetooth status check not supported on this system');
      return false;
    }
  } catch (error) {
    console.error('Error retrieving bluetooth status:', error);
    return false;
  }
}


export async function directory_info() {

  const full_device_sync = CONFIG.full_device_sync; // Change this to your actual server IP

  // Determine the directory path based on the fullDeviceSync flag
  const directoryPath = full_device_sync ? os.homedir() : os.homedir() + "/BCloud";

  const bclouddirectoryName = "BCloud";
  const bclouddirectoryPath = os.homedir() + `/${bclouddirectoryName}`;

  // const directoryName = "BCloud";
  // const directoryPath = os.homedir() + `/${directoryName}`;


  const filesInfo: any[] = [];

  // Check if the directory exists, create if it does not and create a welcome text file
  if (!fs.existsSync(bclouddirectoryPath)) {
    fs.mkdirSync(bclouddirectoryPath, { recursive: true });
    const welcomeFilePath = path.join(bclouddirectoryPath, "welcome.txt");
    fs.writeFileSync(welcomeFilePath,
      "Welcome to Banbury Cloud! This is the directory that will contain all of the files " +
      "that you would like to have in the cloud and streamed throughout all of your devices. " +
      "You may place as many files in here as you would like, and they will appear on all of " +
      "your other devices."
    );
  }
  function getFileKind(filename: string) {
    const ext = path.extname(filename).toLowerCase();
    const fileTypes: { [key: string]: string } = {
      '.png': 'Image',
      '.jpg': 'Image',
      '.JPG': 'Image',
      '.jpeg': 'Image',
      '.gi': 'Image',
      '.bmp': 'Image',
      '.svg': 'Image',
      '.mp4': 'Video',
      '.mov': 'Video',
      '.webm': 'Video',
      '.avi': 'Video',
      '.mkv': 'Video',
      '.wmv': 'Video',
      '.flv': 'Video',
      '.mp3': 'Audio',
      '.wav': 'Audio',
      '.aac': 'Audio',
      '.flac': 'Audio',
      '.ogg': 'Audio',
      '.wma': 'Audio',
      '.pdf': 'Document',
      '.doc': 'Document',
      '.docx': 'Document',
      '.xls': 'Document',
      '.xlsx': 'Document',
      '.ppt': 'Document',
      '.pptx': 'Document',
      '.txt': 'Text',
      '.csv': 'Data',
      '.json': 'Data',
      '.xml': 'Data',
      '.zip': 'Archive',
      '.rar': 'Archive',
      '.7z': 'Archive',
      '.tar': 'Archive',
      '.gz': 'Archive',
      '.exe': 'Executable',
      '.dll': 'Executable',
      '.sh': 'Script',
      '.cpp': 'Script',
      '.ts': 'Script',
      '.bat': 'Script',
      '.rs': 'Script',
      '.py': 'Script',
      '.js': 'Script',
      '.html': 'Web',
      '.css': 'Web',
      // Add more file extensions as needed
    };
    return fileTypes[ext] || 'unknown';
  }

  // Recursive function to get file info
  async function traverseDirectory(currentPath: any) {
    const files = fs.readdirSync(currentPath);
    for (const filename of files) {
      const filePath = path.join(currentPath, filename);
      const stats = fs.statSync(filePath);

      try {
        // Determine if it is a file or directory and push appropriate info to filesInfo
        const fileInfo = {
          "file_type": stats.isDirectory() ? "directory" : "file",
          "file_name": filename,
          "file_path": filePath,
          "date_uploaded": DateTime.fromMillis(stats.birthtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
          "date_modified": DateTime.fromMillis(stats.mtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
          "file_size": stats.isDirectory() ? 0 : stats.size,  // Size is 0 for directories
          "file_priority": 1,
          "file_parent": path.dirname(filePath),
          "original_device": os.hostname(),  // Assuming the current device name as the original device
          "kind": stats.isDirectory() ? 'Folder' : getFileKind(filename),

        };


        // await handlers.files.addFile(username, fileInfo);

        // If it's a directory, recurse into it
        if (stats.isDirectory()) {
          await traverseDirectory(filePath);
        }
        filesInfo.push(fileInfo);
      }
      catch (error) {
        filesInfo.push({
          errors: error
        });
        continue
      }
    }

  }

  // Start processing the files and directories
  await traverseDirectory(directoryPath);

  return filesInfo;

}

export async function getDeviceId(username: string): Promise<string> {

  return `${username}_${os.hostname()}`;
}

export async function getDeviceInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus(),
    totalmem: os.totalmem(),
    freemem: os.freemem()
  };
}



