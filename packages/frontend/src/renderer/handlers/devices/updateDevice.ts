import banbury from '@banbury/core';
import * as DateUtils from '../../../../../core/src/utils/dateUtils';
import axios from 'axios'

export async function updateDevice(username: any) {
  return new Promise((resolve, _reject) => {
    const user = username || "user";
    const device_number = 0;
    const device_name = banbury.device.name();

    (async () => {
      try {
        const files = await banbury.device.directory_info();
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


        const response = await axios.post(`${banbury.config.url}devices/update_devices/${username}/`, device_info_json);

        if (response.status === 200) {
          if (response.data.response === 'success') {
            resolve("success");
          } else {
            resolve("fail");
          }
        } else if (response.status === 400) {
          resolve("fail");
        } else if (response.status === 404) {
          resolve("fail");
        } else {
          resolve(response.data);
        }
      } catch (error) {
        resolve(error);
      }
    })();
  });
}
