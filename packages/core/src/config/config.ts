import path from 'path';
import os from 'os';

export type Config = {
  relayHost: string;
  relayPort: number;
  download_destination: string;
  full_device_sync: boolean;
  skip_dot_files: boolean;
  scan_selected_folders: boolean;
  run_device_info_loop: boolean;
  run_device_predictions_loop: boolean;
  prod: boolean;
  dev: boolean;
  semi_local: boolean;
  url: string;
  url_ws: string;
}

export const config: Config = {
  relayHost: '32.27.118.149',
  relayPort: 443,
  download_destination: path.join(os.homedir(), 'Downloads'),
  full_device_sync: false,
  skip_dot_files: true,
  scan_selected_folders: true,
  run_device_info_loop: true,
  run_device_predictions_loop: true,
  prod: false,
  dev: true,
  semi_local: false,
  get url() {
    //return this.prod ? 'https://banbury-cloud-backend-prod-389236221119.us-east1.run.app/' : 'http://localhost:8080/';
    if (this.prod) {
      return 'http://54.224.116.254:8080';
    } else if (this.dev) {
      // return 'http://54.197.4.251:8080';
      //return 'http://3.84.158.138:8080';
      return 'http://www.api.dev.banbury.io';
    } else if (this.semi_local) {
      return 'http://10.123.1.90:8080/';
    } else {
      return 'http://localhost:8080/';
    }
  },
  get url_ws() {
    if (this.prod) {
      return 'wss://54.224.116.254:8082';
    } else if (this.dev) {
      return `wss://www.api.dev.banbury.io/ws/consumer/`;
    }
    else if (this.semi_local) {
      return `ws://10.123.1.90:8082/ws/consumer/`;
    } else {
      return `ws://localhost:8082/ws/consumer/`;
    }
  }
}
