import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TOKEN_FILE = path.join(os.homedir(), '.banbury_token');

// Set a default (empty) Authorization header
axios.defaults.headers.common['Authorization'] = '';

/**
 * Sets a custom global Authorization header for all axios requests and saves it to disk.
 * @param token - The authentication token
 */
export function setGlobalAxiosAuthToken(token: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  try {
    fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  } catch (err) {
    console.error('Failed to save token:', err);
  }
}

/**
 * Loads the token from disk and sets it as the global Authorization header.
 */
export function loadGlobalAxiosAuthToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    // Ignore if file doesn't exist or can't be read
  }
} 
