import axios from 'axios';
import { CONFIG } from '../config';

export function getDeviceData(
  selectedDevice: any,
  setSelectedDevice: any,
  setAllDevices: any,
  setIsLoading: any,
): () => Promise<void> {
  return async () => {
    // Set loading state to true at the beginning
    setIsLoading(true);
    
    try {
      const previousSelectedDeviceName = selectedDevice?.device_name; // Store the previously selected device name

      // Fetch device information
      const deviceInfoResponse = await axios.get<{
        devices: any[];
      }>(`${CONFIG.url}/devices/getdeviceinfo/`);

      const devicePredictionsResponse = await axios.get<{
        data: {
          device_predictions: Array<{
            device_id: string;
            device_name: string;
            device_manufacturer: string;
            device_model: string;
            device_version: string;
            services: string;
            cpu_info_brand: string;
            cpu_info_cores: number;
            cpu_info_processors: number;
            cpu_info_physicalCores: number;
            device_priority: number;
            mac_address: string;
            ip_address: string;
            files_available_for_download: number;
            files_needed: number;
            predicted_cpu_usage: number;
            predicted_download_speed: number;
            predicted_gpu_usage: number;
            predicted_ram_usage: number;
            predicted_upload_speed: number;
            use_predicted_cpu_usage: boolean;
            use_predicted_download_speed: boolean;
            use_predicted_gpu_usage: boolean;
            use_predicted_ram_usage: boolean;
            use_predicted_upload_speed: boolean;
            use_files_available_for_download: boolean;
            use_files_needed: boolean;
            use_device_in_file_sync: boolean;
            score: number;
            score_timestamp: string;
            sync_storage_capacity_gb: number;
            timestamp: string;
          }>;
          result: string;
        };
      }>(`${CONFIG.url}/predictions/get_device_prediction_data/`);

      const { devices } = deviceInfoResponse.data;
      const { device_predictions } = devicePredictionsResponse.data.data;

      // Transform device data
      const transformedDevices: any[] = devices.map((device, index) => {

        // Find matching predictions for this device with default values
        const devicePrediction = device_predictions?.find(
          pred => pred.device_name === device.device_name
        ) || {
          predicted_cpu_usage: 0,
          predicted_ram_usage: 0,
          predicted_gpu_usage: 0,
          predicted_download_speed: 0,
          predicted_upload_speed: 0,
          use_predicted_cpu_usage: false,
          use_predicted_download_speed: false,
          use_predicted_gpu_usage: false,
          use_predicted_ram_usage: false,
          use_predicted_upload_speed: false,
          use_files_available_for_download: false,
          use_files_needed: false,
          use_device_in_file_sync: false,
          sync_storage_capacity_gb: 0,
          files_available_for_download: 0,
          files_needed: 0,
          score: 0
        };

        return {
          _id: device._id,
          id: index + 1,
          device_name: device.device_name,
          device_manufacturer: device.device_manufacturer,
          device_model: device.device_model,
          storage_capacity_gb: device.storage_capacity_gb,
          total_storage: device.total_storage,
          upload_speed: Array.isArray(device.upload_speed)
            ? device.upload_speed[0] || 'N/A'
            : device.upload_speed || 'N/A',
          download_speed: Array.isArray(device.download_speed)
            ? device.download_speed[0] || 'N/A'
            : device.download_speed || 'N/A',
          battery_status: Array.isArray(device.battery_status)
            ? device.battery_status[0] || 'N/A'
            : device.battery_status || 'N/A',
          battery_time_remaining: device.battery_time_remaining,
          available: device.online ? "Available" : "Unavailable",
          cpu_info_manufacturer: device.cpu_info_manufacturer,
          cpu_info_brand: device.cpu_info_brand,
          cpu_info_speed: device.cpu_info_speed,
          cpu_info_cores: device.cpu_info_cores,
          cpu_info_physical_cores: device.cpu_info_physical_cores,
          cpu_info_processors: device.cpu_info_processors,
          cpu_info_socket: device.cpu_info_socket,
          cpu_info_vendor: device.cpu_info_vendor,
          cpu_info_family: device.cpu_info_family,
          cpu_usage: device.cpu_usage,
          gpu_usage: Array.isArray(device.gpu_usage)
            ? device.gpu_usage
            : [device.gpu_usage],
          ram_usage: device.ram_usage,
          ram_total: device.ram_total,
          ram_free: device.ram_free,
          scanned_folders: Array.isArray(device.scanned_folders) ? device.scanned_folders : [],
          downloaded_models: Array.isArray(device.downloaded_models) ? device.downloaded_models : [],
          sync_storage_capacity_gb: devicePrediction.sync_storage_capacity_gb,
          predicted_cpu_usage: devicePrediction.predicted_cpu_usage,
          predicted_ram_usage: devicePrediction.predicted_ram_usage,
          predicted_gpu_usage: devicePrediction.predicted_gpu_usage,
          predicted_download_speed: devicePrediction.predicted_download_speed,
          predicted_upload_speed: devicePrediction.predicted_upload_speed,
          predicted_performance_score: devicePrediction.score,
          files_available_for_download: devicePrediction.files_available_for_download,
          files_needed: devicePrediction.files_needed,
          use_predicted_cpu_usage: devicePrediction.use_predicted_cpu_usage,
          use_predicted_download_speed: devicePrediction.use_predicted_download_speed,
          use_predicted_gpu_usage: devicePrediction.use_predicted_gpu_usage,
          use_predicted_ram_usage: devicePrediction.use_predicted_ram_usage,
          use_predicted_upload_speed: devicePrediction.use_predicted_upload_speed,
          use_files_available_for_download: devicePrediction.use_files_available_for_download,
          use_files_needed: devicePrediction.use_files_needed,
          use_device_in_file_sync: devicePrediction.use_device_in_file_sync,
        };
      });

      setAllDevices(transformedDevices);

      // Restore the previously selected device if it exists in the new list
      const restoredDevice = transformedDevices.find(device => device.device_name === previousSelectedDeviceName);
      if (restoredDevice) {
        setSelectedDevice(restoredDevice);
      } else if (transformedDevices.length > 0) {
        setSelectedDevice(transformedDevices[0]); // Fallback to the first device if the previous one is not found
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };
}


