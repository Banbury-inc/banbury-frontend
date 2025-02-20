import path from 'path';
import os from 'os';

const PRODUCTION_API = 'http://www.api.dev.banbury.io';
const PRODUCTION_WS = 'ws://www.api.dev.banbury.io/ws/consumer';

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
  // In development mode, use the production API
  url: PRODUCTION_API,
  url_ws: PRODUCTION_WS
}
