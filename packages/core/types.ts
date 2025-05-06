import * as device from './src/device';
import * as handlers from './src/handlers';
import * as networking from './src/networking';
import * as sessions from './src/sessions';
import * as types from './src/types';
import * as files from './src/files';
import * as settings from './src/settings';
import * as notifications from './src/notifications';
import * as analytics from './src/analytics';
import * as auth from './src/authentication';
import { config } from './src/config';

export interface Banbury {
  device: typeof device;
  handlers: typeof handlers;
  networking: typeof networking;
  sessions: typeof sessions;
  types: typeof types;
  files: typeof files;
  settings: typeof settings;
  notifications: typeof notifications;
  analytics: typeof analytics;
  auth: typeof auth;
  config: typeof config;
}

declare const banbury: Banbury;
export default banbury;
