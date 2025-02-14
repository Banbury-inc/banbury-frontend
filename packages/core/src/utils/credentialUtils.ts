
import * as path from 'path';
import ConfigParser from 'configparser';
import * as fs from 'fs';
import * as os from 'os';

const homeDirectory = os.homedir();
const BANBURY_FOLDER = path.join(homeDirectory, '.banbury');
const CONFIG_FILE = path.join(BANBURY_FOLDER, '.banbury_config.ini');

export function loadCredentials(): Record<string, string> {
  try {
    const config = new ConfigParser();
    config.read(CONFIG_FILE);
    const credentialsFile = config.get('banbury_cloud', 'credentials_file') || 'default_filename.json';
    const credentialsFilePath = path.join(BANBURY_FOLDER, credentialsFile);
    return JSON.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  } catch (error) {
    console.error('Error loading credentials:', error);
    return {};
  }
}


