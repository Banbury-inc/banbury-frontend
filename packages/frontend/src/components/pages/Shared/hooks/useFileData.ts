import axios from 'axios';
import fs from 'fs';
import { useEffect, useState } from 'react';
import { fileWatcherEmitter } from '@banbury/core/src/device/watchdog';
import { DatabaseData } from '../types';
import path from 'path';
import os from 'os';
import banbury from '@banbury/core';
const file_name: string = 'mmills_database_snapshot.json';
const directory_name: string = 'BCloud';
const directory_path: string = path.join(os.homedir(), directory_name);
const snapshot_json: string = path.join(directory_path, file_name);

export const useFileData = (
  username: string | null,
  disableFetch: boolean,
  updates: number,
  global_file_path: string | null,
  global_file_path_device: string | null,
  setFirstname: (name: string) => void,
  setLastname: (name: string) => void,
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [allFiles, setAllFiles] = useState<DatabaseData[]>([]);
  const [fileRows, setFileRows] = useState<DatabaseData[]>([]);

  const fetchData_with_api = async () => {
    try {
      // Step 1: Fetch user information
      //
      const userInfoResponse = await axios.get<{
        first_name: string;
        last_name: string;
        phone_number: string;
        email: string;
      }>(`${banbury.config.url}/users/getuserinfo/${username}/`);

      const { first_name, last_name } = userInfoResponse.data;
      setFirstname(first_name);
      setLastname(last_name);

      // Step 2: Fetch device information
      const deviceInfoResponse = await axios.get<{
        devices: any[];
      }>(`${banbury.config.url}/devices/getdeviceinfo/${username}/`);

      const { devices } = deviceInfoResponse.data;

      let files: DatabaseData[] = [];

      // set files to the value of snapshot_json if it exists
      if (fs.existsSync(snapshot_json)) {
        const snapshot = fs.readFileSync(snapshot_json, 'utf-8');
        files = JSON.parse(snapshot);
        console.log('Loaded snapshot from file:', snapshot_json);
        console.log('Snapshot:', files);
      }

      // Combine devices with their associated files
      let allFilesData = mapDevicesToFiles(devices, files);

      if (!disableFetch) {
        setAllFiles(allFilesData);
      }

      console.log('Local file data loaded');
      setIsLoading(false);

      // Step 3: Fetch files for all devices
      const fileInfoResponse = await axios.get<{
        files: any[];
      }>(`${banbury.config.url}/files/getfileinfo/${username}/`);

      files = fileInfoResponse.data.files;

      // save files as a json
      fs.writeFileSync(snapshot_json, JSON.stringify(files, null, 2), 'utf-8');

      allFilesData = mapDevicesToFiles(devices, files);

      if (!disableFetch) {
        setAllFiles(allFilesData);
      }

      console.log('API file data loaded');
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Step 1: Fetch user information
      const userInfoResponse = await axios.get<{
        first_name: string;
        last_name: string;
        phone_number: string;
        email: string;
      }>(`${banbury.config.url}/users/getuserinfo/${username}/`);

      const { first_name, last_name } = userInfoResponse.data;
      setFirstname(first_name);
      setLastname(last_name);

      // Step 2: Fetch device information
      const deviceInfoResponse = await axios.get<{
        devices: any[];
      }>(`${banbury.config.url}/devices/getdeviceinfo/${username}/`);

      const { devices } = deviceInfoResponse.data;

      let files: DatabaseData[] = [];

      if (fs.existsSync(snapshot_json)) {
        const snapshot = fs.readFileSync(snapshot_json, 'utf-8');
        files = JSON.parse(snapshot);
        console.log('Loaded snapshot from file:', snapshot_json);
        console.log('Snapshot:', files);
      }

      const allFilesData = mapDevicesToFiles(devices, files);

      if (!disableFetch) {
        setAllFiles(allFilesData);
      }

      console.log('Local file data loaded');
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to map devices to files
  const mapDevicesToFiles = (devices: any[], files: DatabaseData[]) => {
    return devices.flatMap((device, index) => {
      const deviceFiles = files.filter((file) => file.device_name === device.device_name);
      return deviceFiles.map((file, fileIndex) => ({
        id: index * 1000 + fileIndex,
        file_name: file.file_name,
        file_size: file.file_size,
        kind: file.kind,
        file_path: file.file_path,
        date_uploaded: file.date_uploaded,
        date_modified: file.date_modified,
        deviceID: (index + 1).toString(),
        device_name: device.device_name,
        original_device: device.device_name,
        helpers: 0,
        available: device.online ? 'Available' : 'Unavailable',
        file_priority: file.file_priority,
        device_ids: device.device_ids,
        owner: file.owner,
      }));
    });
  };

  // Initial data fetch
  useEffect(() => {
    fetchData_with_api();
  }, [username, disableFetch, updates]);

  // File watcher effect
  useEffect(() => {
    const handleFileChange = () => {
      console.log('File changed, fetching data...');
      fetchData();
    };

    fileWatcherEmitter.on('fileChanged', handleFileChange);

    return () => {
      fileWatcherEmitter.off('fileChanged', handleFileChange);
    };
  }, [username, disableFetch]);

  // Filter files effect
  useEffect(() => {
    const pathToShow = global_file_path || '/';
    const pathSegments = pathToShow.split('/').filter(Boolean).length;

    const filteredFiles = allFiles.filter((file) => {
      if (!global_file_path && !global_file_path_device) {
        return true; // Show all files
      }

      if (!global_file_path && global_file_path_device) {
        return file.device_name === global_file_path_device; // Show all files for the specified device
      }

      if (!file.file_path) {
        return false; // Skip files with undefined filePath
      }

      const fileSegments = file.file_path.split('/').filter(Boolean).length;
      const isInSameDirectory = file.file_path.startsWith(pathToShow) && fileSegments === pathSegments + 1;
      const isFile = file.file_path === pathToShow && file.kind !== 'Folder';

      return isInSameDirectory || isFile;
    });

    setFileRows(filteredFiles);
  }, [global_file_path, global_file_path_device, allFiles]);

  return {
    isLoading,
    allFiles,
    fileRows,
    setAllFiles,
  };
}; 
