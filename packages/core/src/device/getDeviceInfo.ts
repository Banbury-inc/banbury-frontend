import { banbury } from '..'

export async function getDeviceInfo() {
    try {
        const [
            current_time,
            usb_devices,
            storage_capacity_gb,
            device_manufacturer,
            device_model,
            device_version,
            cpu_info_manufacturer,
            cpu_info_brand,
            cpu_info_speed,
            cpu_info_cores,
            cpu_info_physical_cores,
            cpu_info_processors,
            cpu_usage,
            gpu_usage,
            ram_usage,
            ram_total,
            ram_free,
            ip_address,
            mac_address,
            battery_status,
            battery_time_remaining,
            upload_speed,
            download_speed,
            bluetooth_status
        ] = await Promise.all([
            banbury.device.current_time(),
            banbury.device.usb_devices(),
            banbury.device.storage_capacity(),
            banbury.device.device_manufacturer(),
            banbury.device.device_model(),
            banbury.device.device_version(),
            banbury.device.cpu_info_manufacturer(),
            banbury.device.cpu_info_brand(),
            banbury.device.cpu_info_speed(),
            banbury.device.cpu_info_cores(),
            banbury.device.cpu_info_physicalCores(),
            banbury.device.cpu_info_processors(),
            banbury.device.cpu_usage(),
            banbury.device.gpu_usage(),
            banbury.device.ram_usage(),
            banbury.device.ram_total(),
            banbury.device.ram_free(),
            banbury.device.ip_address(),
            banbury.device.mac_address(),
            banbury.device.battery_status(),
            banbury.device.battery_time_remaining(),
            banbury.device.upload_speed(),
            banbury.device.download_speed(),
            banbury.device.bluetooth_status()
        ]);

        return {
            current_time,
            usb_devices,
            storage_capacity_gb,
            device_manufacturer,
            device_model,
            device_version,
            cpu_info_manufacturer,
            cpu_info_brand,
            cpu_info_speed,
            cpu_info_cores,
            cpu_info_physical_cores,
            cpu_info_processors,
            cpu_usage,
            gpu_usage,
            ram_usage,
            ram_total,
            ram_free,
            ip_address,
            mac_address,
            battery_status,
            battery_time_remaining,
            upload_speed,
            download_speed,
            bluetooth_status,
        };
    } catch (error) {
        console.error('Error fetching device info:', error);
        throw error; // Re-throw the error for the caller to handle
    }
}
