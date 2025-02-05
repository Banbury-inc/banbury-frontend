import { useEffect, useState } from 'react';
import { fileWatcherEmitter } from '../../../../neuranet/device/watchdog';
import { fetchDeviceData } from '../utils/fetchDeviceData';


export const newUseFileData = (
  username: string | null,
  disableFetch: boolean,
  filePath: string | null,
  filePathDevice: string | null,
  setFirstname: (name: string) => void,
  setLastname: (name: string) => void,
  files: any,
  sync_files: any,
  devices: any,
  setDevices: (devices: any[]) => void,
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [fileRows, setFileRows] = useState<any[]>([]);

  // Helper function to map devices to files
  const mapDevicesToFiles = (devices: any[], files: any[]) => {
    return devices.flatMap((device, deviceIndex) => {
      const deviceFiles = files.filter((file) => file.device_name === device.device_name);
      return deviceFiles.map((file, fileIndex) => ({
        _id: file._id,
        id: `${device.device_name}-${file.file_path}-${deviceIndex}-${fileIndex}`,
        file_name: file.file_name,
        file_size: file.file_size,
        kind: file.kind,
        file_path: file.file_path,
        date_uploaded: file.date_uploaded,
        deviceID: (deviceIndex + 1).toString(),
        device_name: device.device_name,
        helpers: 0,
        available: device.online ? 'Available' : 'Unavailable',
        priority: file.priority,
        shared_with: file.shared_with,
        is_public: file.is_public,
        device_ids: device.device_ids,
        device_id: file.device_id,
      }));
    });
  };




  // Filter files effect
  useEffect(() => {
    if (!devices) {
      // Fetch devices if they're not available
      console.log("Fetching devices from newUseFileData");
      fetchDeviceData(username || '')
        .then((new_devices) => {
          if (new_devices) {
            setDevices(new_devices);
          }
        })
        .catch((error) => {
          console.error("Error fetching device data:", error);
        });
      return;
    }

    // First map devices to files to include availability
    const regularFilesData = mapDevicesToFiles(devices, files);

    // Combine regular files and sync files
    const allFilesData = [...regularFilesData];


    setAllFiles(allFilesData);

    // Then filter the mapped files
    const file_path = filePath?.split('/').slice(3).join('/');
    const pathToShow = '/' + (file_path || '/');
    const pathSegments = pathToShow.split('/').filter(Boolean).length;

    const filteredFiles = allFilesData.filter((file: any) => {
      if (!filePath && !filePathDevice) {
        return true; // Show all files
      }

      if (filePath === "Core/Cloud Sync") {
        setFileRows(sync_files);
        // Show any file that contains "Cloud Sync" in its path
        return sync_files;
      }

      if (!filePath && filePathDevice) {
        return file.device_name === filePathDevice; // Filter by device
      }

      if (!file.file_path) {
        return false; // Skip files with undefined filePath
      }

      const fileSegments = file.file_path.split('/').filter(Boolean).length;
      const isInSameDirectory = file.file_path.startsWith(pathToShow) && fileSegments === pathSegments + 1;
      const isFile = file.file_path === pathToShow && file.kind !== 'Folder';

      return isInSameDirectory || isFile;
    });

    if (filePath === "Core/Cloud Sync") {
      setFileRows(sync_files);
    } else {
      setFileRows(filteredFiles);
    }

    if (isLoading) {
      setIsLoading(false);
    }

  }, [filePath, filePathDevice, files, devices, setDevices]);

  // Add effect to listen for device status changes
  useEffect(() => {
    const handleDeviceStatusChange = () => {
      // Refetch device data when status changes
      console.log("Refetching devices from newUseFileData line 139");
      fetchDeviceData(username || '')
        .then((new_devices) => {
          if (new_devices) {
            setDevices(new_devices);
          }
        })
        .catch((error) => {
          console.error("Error refreshing device data:", error);
        });
    };

    // Listen for device status changes
    fileWatcherEmitter.on('deviceStatusChange', handleDeviceStatusChange);

    // Cleanup listener
    return () => {
      fileWatcherEmitter.off('deviceStatusChange', handleDeviceStatusChange);
    };
  }, [username, disableFetch, filePath, setFirstname, setLastname, setDevices]);






  return {
    isLoading,
    allFiles,
    fileRows,
    setAllFiles,
  };
};


