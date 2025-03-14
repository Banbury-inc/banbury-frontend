import { contextBridge, ipcRenderer } from 'electron';


// const { BrowserWindow } = require('@electron/remote')


const mainProcess = require('electron').ipcRenderer;

async function fetchData() {
  const API_URL = 'https://api.example.com/data';
  mainProcess.send('fetch-data', API_URL);
  mainProcess.once('fetch-data-response', (_event, data) => {
    // Use the fetched data here
    console.log(data);
  });
  mainProcess.once('fetch-data-error', (_event, errorMessage) => {
    console.error('Error fetching data:', errorMessage);
    // Handle errors gracefully, e.g., display an error message to the user
  });
}

fetchData();


contextBridge.exposeInMainWorld('electronAPI', {
    receivePythonOutput: (callback: (output: string) => void) => {
        ipcRenderer.on('python-output', (_, output) => callback(output));
    },
});

