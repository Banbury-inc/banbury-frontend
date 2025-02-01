import { neuranet } from '../../neuranet'
import * as DateUtils from '../../utils/dateUtils';
import axios from 'axios'
import { CONFIG } from '../../config/config'  

export async function updateDevice(username: any) {
  return new Promise(async (resolve, reject) => {
    const user = username || "user";
    const device_number = 0;
    const device_name = neuranet.device.name();
    const files = await neuranet.device.directory_info();
    const date_added = DateUtils.get_current_date_and_time();

    interface SmallDeviceInfo {
      user: string;
      device_number: number;
      device_name: string;
      files: FileInfo[];
      date_added: string;
    }

    interface FileInfo {
      File_Type: string;
      File_Name: string;
      Kind: string;
      Date_Uploaded: string;
      File_Size: number;
      File_Priority: number;
      File_Path: string;
      Original_Device: string;
    }

    const device_info_json: SmallDeviceInfo = {
      user,
      device_number,
      device_name,
      files,
      date_added,
    };

    console.log(device_info_json);

    try {
      const response = await axios.post(`${CONFIG.url}devices/update_devices/${username}/`, device_info_json);

      if (response.status === 200) {
        if (response.data.response === 'success') {
          console.log("Successfully updated devices");
          const result = "success"
          resolve(result);
        } else {
          console.log("Failed to update devices");
          console.log(response.data);
          const result = "fail"
          resolve(result);
        }
      } else if (response.status === 400) {
        console.log("Bad request");
        const result = "fail"
        resolve(result);
      } else if (response.status === 404) {
        console.log("error");
        const result = "fail"
        resolve(result);
      }
      else {
        console.log("error");
        const result = response.data;
        resolve(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      const result = "fail"
      resolve(result);
    }
  });
}
