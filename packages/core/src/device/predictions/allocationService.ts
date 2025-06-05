// Types and interfaces
export interface Device {
  device_name: string;
  device_id?: string;
  score: number;
  sync_storage_capacity_gb: number;
  use_device_in_file_sync?: boolean;
  files?: AllocatedFile[];
  used_capacity?: number;
}

export interface AllocatedFile {
  file_id: string;
  file_name: string;
}

export interface FileInfo {
  _id: string;
  file_name?: string;
  file_size?: number;
  file_priority?: number;
}

export interface FileSyncInfo {
  files: FileInfo[];
}

export interface DevicePredictions {
  device_predictions: Device[];
}

export interface FileDeviceMapping {
  file_id: string;
  proposed_device_ids: string[];
}

// Example data
const devices: Device[] = [
  { device_name: "Device A", score: 90, sync_storage_capacity_gb: 500 },
  { device_name: "Device B", score: 80, sync_storage_capacity_gb: 300 },
  { device_name: "Device C", score: 70, sync_storage_capacity_gb: 450 }
];

export class AllocationService {
  constructor() {
    // Initializes the AllocationService
  }

  /**
   * Converts bytes to gigabytes.
   * @param bytes - The size in bytes.
   * @returns The size in gigabytes.
   */
  bytesToGigabytes(bytes: number): number {
    return bytes / (1024 ** 3); // Convert bytes to gigabytes
  }

  /**
   * Allocates files to devices based on device scores and file priorities.
   * 
   * Sorts devices by score (descending) and files by priority (high to low)
   * and then size (descending). Assigns files to the highest-scoring available
   * device that has sufficient capacity.
   * 
   * @param fetchedDevicePredictions - A dictionary containing device prediction data,
   *                                   including scores and storage capacities.
   * @param fileSyncInfo - A list of dictionaries, where the first element
   *                       contains a list of files to be synced, including
   *                       their size and priority.
   * @returns A list of device dictionaries, updated with allocated files
   *          and used capacity.
   */
  devices(fetchedDevicePredictions: DevicePredictions, fileSyncInfo: FileSyncInfo[]): Device[] {
    // Extract the list of devices from the nested dictionary
    let devicesList = fetchedDevicePredictions.device_predictions || [];
    
    // Filter out devices with None storage capacity and set default values
    devicesList = devicesList
      .filter(device => device.sync_storage_capacity_gb != null)
      .map(device => ({
        ...device,
        sync_storage_capacity_gb: device.sync_storage_capacity_gb || 0,
        score: device.score || 0
      }));
    console.log('Devices list after filtering:', devicesList);

    // Filter out devices where use_device_in_file_sync is false
    devicesList = devicesList.filter(device => device.use_device_in_file_sync === true);
    console.log('Devices list after filtering:', devicesList);
    
    // Sort devices by score (descending)
    devicesList.sort((a, b) => b.score - a.score);

    // Sort files by priority and size (descending)
    const priorityMap: { [key: number]: number } = { 3: 3, 2: 2, 1: 1 };
    const sortedFiles = fileSyncInfo[0].files.sort((a, b) => {
      const aPriority = priorityMap[a.file_priority || 1] || 1;
      const bPriority = priorityMap[b.file_priority || 1] || 1;
      const aSize = a.file_size || 0;
      const bSize = b.file_size || 0;
      
      // First sort by priority (descending), then by size (descending)
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return bSize - aSize;
    });

    // Allocate files to devices
    for (const device of devicesList) {
      device.files = [];
      device.used_capacity = 0; // Initialize used capacity in gigabytes
    }

    console.log('Files to allocate:', sortedFiles.map(f => ({
      _id: f._id,
      file_name: f.file_name,
      file_size: f.file_size,
      file_size_gb: this.bytesToGigabytes(f.file_size || 0)
    })));
    
    console.log('Devices available for allocation:', devicesList.map(d => ({
      device_name: d.device_name,
      sync_storage_capacity_gb: d.sync_storage_capacity_gb,
      used_capacity: d.used_capacity
    })));

    for (const file of sortedFiles) {
      const fileSizeGb = this.bytesToGigabytes(file.file_size || 0); // Convert file size to gigabytes
      console.log(`\nAllocating file ${file.file_name} (${fileSizeGb.toFixed(3)} GB):`);
      
      let fileAllocated = false;
      for (const device of devicesList) {
        const availableSpace = device.sync_storage_capacity_gb - (device.used_capacity || 0);
        console.log(`  Device ${device.device_name}: ${availableSpace.toFixed(3)} GB available, needs ${fileSizeGb.toFixed(3)} GB`);
        
        if ((device.used_capacity || 0) + fileSizeGb <= device.sync_storage_capacity_gb) {
          // Store both file name and ID
          device.files!.push({
            file_id: String(file._id),
            file_name: file.file_name || '',
          });
          device.used_capacity = (device.used_capacity || 0) + fileSizeGb;
          console.log(`    ✅ Allocated to ${device.device_name} (now using ${device.used_capacity.toFixed(3)} GB)`);
          fileAllocated = true;
          // Continue to the next device even if the file has been added - this allows file replication
        } else {
          console.log(`    ❌ Not enough space on ${device.device_name}`);
        }
      }
      
      if (!fileAllocated) {
        console.log(`  ⚠️ File ${file.file_name} could not be allocated to any device`);
      }
    }

    return devicesList;
  }

  /**
   * Allocates files to devices with a uniform capacity cap.
   * 
   * Similar to the `devices` method but applies a specified capacity cap
   * to all devices before allocation.
   * 
   * @param fetchedDevicePredictions - Device prediction data.
   * @param fileSyncInfo - List of files to be synced.
   * @param deviceCapacityCap - The storage capacity cap in GB for each device.
   * @returns A list of device dictionaries, updated with allocated files,
   *          used capacity, and the applied capacity cap.
   */
  devicesWithCapacityCap(
    fetchedDevicePredictions: DevicePredictions, 
    fileSyncInfo: FileInfo[], 
    deviceCapacityCap: number
  ): Device[] {
    // Extract the list of devices from the nested dictionary
    const devicesList = fetchedDevicePredictions.device_predictions || [];
    
    // Sort devices by score (descending)
    devicesList.sort((a, b) => b.score - a.score);

    // Sort files by priority and size (descending)
    const priorityMap: { [key: number]: number } = { 3: 3, 2: 2, 1: 1 };
    fileSyncInfo.sort((a, b) => {
      const aPriority = priorityMap[a.file_priority || 1];
      const bPriority = priorityMap[b.file_priority || 1];
      const aSize = a.file_size || 0;
      const bSize = b.file_size || 0;
      
      // First sort by priority (descending), then by size (descending)
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return bSize - aSize;
    });

    // Allocate files to devices
    for (const device of devicesList) {
      device.sync_storage_capacity_gb = deviceCapacityCap;
      device.files = [];
      device.used_capacity = 0; // Initialize used capacity in gigabytes
    }

    for (const file of fileSyncInfo) {
      const fileSizeGb = this.bytesToGigabytes(file.file_size || 0); // Convert file size to gigabytes
      for (const device of devicesList) {
        if ((device.used_capacity || 0) + fileSizeGb <= device.sync_storage_capacity_gb) {
          // Store both file name and ID
          device.files!.push({
            file_id: String(file._id),
            file_name: file.file_name || '',
          });
          device.used_capacity = (device.used_capacity || 0) + fileSizeGb;
          break;
        }
      }
    }

    return devicesList;
  }

  /**
   * Generates a mapping of files to the devices they are proposed to be stored on.
   * 
   * @param allocatedDevices - A list of device dictionaries, output from
   *                           the allocation methods (`devices` or
   *                           `devicesWithCapacityCap`).
   * @returns A list of dictionaries, each containing a 'file_id' and a
   *          list of 'proposed_device_ids' for that file.
   */
  generateFileDeviceMappings(allocatedDevices: Device[]): FileDeviceMapping[] {
    const fileMappings: { [fileId: string]: FileDeviceMapping } = {};
    console.log('Generating file device mappings for', allocatedDevices.length, 'devices');

    // Iterate through each device and its allocated files
    for (const device of allocatedDevices) {
      console.log(`Processing device: ${device.device_name}, device_id: ${device.device_id}, files: ${device.files?.length || 0}`);
      const deviceId = device.device_id;
      if (!deviceId) {
        console.log(`Skipping device ${device.device_name} - no device_id`);
        continue;
      }

      // Go through each file allocated to this device
      for (const fileInfo of device.files || []) {
        console.log(`Processing file: ${fileInfo.file_id} for device ${device.device_name}`);
        const fileId = fileInfo.file_id;
        if (!fileId) {
          console.log('Skipping file - no file_id');
          continue;
        }

        // Initialize the list of device IDs if this is the first time seeing this file
        if (!(fileId in fileMappings)) {
          fileMappings[fileId] = {
            file_id: fileId,
            proposed_device_ids: []
          };
        }
        
        // Add this device's ID to the file's proposed devices
        fileMappings[fileId].proposed_device_ids.push(deviceId);
        console.log(`Added device ${deviceId} to file ${fileId}`);
      }
    }

    console.log('Final file mappings:', Object.values(fileMappings));
    // Convert the dictionary to a list
    return Object.values(fileMappings);
  }
}
