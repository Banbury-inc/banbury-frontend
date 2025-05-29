import { loadGlobalAxiosCredentials } from "@banbury/core/src/middleware/axiosGlobalHeader";
import { CONFIG } from "@banbury/core/src/config";

export const handleAddModelToBackend = async (deviceName: string, modelName: string) => {
    console.info(`DEBUG: addModelToBackend called with device: ${deviceName}, model: ${modelName}`);
    const { token } = loadGlobalAxiosCredentials();
    const url = `${CONFIG?.url || 'http://www.api.dev.banbury.io'}/devices/add_downloaded_model/`;
    
    console.info(`DEBUG: Making POST request to: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        device_name: deviceName,
        model_name: modelName,
      }),
      credentials: 'include',
    });

    console.info(`DEBUG: Response status: ${response.status}`);
    const data = await response.json();
    console.info(`DEBUG: Response data:`, data);
    
    if (data.result !== 'success') {
      throw new Error(data.error || data.message || 'Failed to add model');
    }
    return data;
  };