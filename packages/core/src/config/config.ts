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
  local_ws_url: string;
  semi_local_ws_url: string;
  production_ws_url: string;
  local_api_url: string;
  semi_local_api_url: string;
  production_api_url: string;
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
  get local_api_url() {
    return 'http://localhost:8080/';
  },
  get semi_local_api_url() {
    return 'http://10.123.1.90:8080/';
  },
  get production_api_url() {
    return 'http://www.api.dev.banbury.io';
  },
  get local_ws_url() {
    return 'ws://localhost:8082/ws/consumer/';
  },
  get semi_local_ws_url() {
    return 'ws://10.123.1.90:8082/ws/consumer/';
  },
  get production_ws_url() {
    return 'ws://www.api.dev.banbury.io/ws/consumer/';
  },
  get url() {
    if (this.prod) {
      return 'http://54.224.116.254:8080';
    } else if (this.semi_local) {
      return this.semi_local_api_url;
    } else if (this.dev) {
      return this.production_api_url;
    } else {
      return this.local_api_url;
    }
  },
  get url_ws() {
    if (this.prod) {
      return 'ws://54.224.116.254:8082';
    } else if (this.semi_local) {
      return this.semi_local_ws_url;
    } else if (this.dev) {
      return this.production_ws_url;
    } else {
      return this.local_ws_url;
    }
  }
}
