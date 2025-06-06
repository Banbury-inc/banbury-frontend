import axios from 'axios';
import { DatabaseData } from '@banbury/core/src/types';
import banbury from '@banbury/core';

export const fetchFileData = async (
    global_file_path: string,
    {
        existingFiles = [],
    }: {
        setFirstname: (name: string) => void;
        setLastname: (name: string) => void;
        setFileRows: (rows: DatabaseData[]) => void;
        setIsLoading: (loading: boolean) => void;
        cache: Map<string, DatabaseData[]>;
        existingFiles?: DatabaseData[];
    }
) => {
    try {
        const fileInfoResponse = await axios.post<{ files: DatabaseData[]; }>(
            `${banbury.config.url}/files/get_files_from_filepath/`,
            {
                global_file_path: global_file_path
            }
        );

        // Ensure we have a valid response structure
        if (!fileInfoResponse.data || typeof fileInfoResponse.data !== 'object') {
            console.warn('Invalid response structure from API:', fileInfoResponse.data);
            return [];
        }

        // Ensure files array exists and is valid
        if (!fileInfoResponse.data.files || !Array.isArray(fileInfoResponse.data.files)) {
            console.warn('No files array in response or files is not an array:', fileInfoResponse.data);
            return [];
        }

        // Ensure we have a valid array before creating the Set
        if (!Array.isArray(existingFiles)) {
            return fileInfoResponse.data.files || [];
        }

        // Filter out files that already exist before returning
        const existingFileKeys = new Set(
            existingFiles.map(file => `${file.file_path}-${file.device_name}`)
        );

        const uniqueNewFiles = fileInfoResponse.data.files.filter(file =>
            !existingFileKeys.has(`${file.file_path}-${file.device_name}`)
        );

        return uniqueNewFiles;

    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
} 
