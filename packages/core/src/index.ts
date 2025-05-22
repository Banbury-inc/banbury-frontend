import * as middleware from './middleware';
import * as device from './device';
import * as handlers from './handlers';
import * as networking from './networking';
import * as sessions from './sessions';
import * as files from './files';
import * as types from './types';
import * as settings from './settings';
import * as notifications from './notifications';
import * as analytics from './analytics';
import * as auth from './auth';
import { config } from './config';

/**
 * The main entry point for the neuranet library.
 */
export const banbury = {
  middleware,
  auth,
  device,
  handlers,
  networking,
  sessions,
  types,
  files,
  settings,
  notifications,
  analytics,
  config,
};

export default banbury;
