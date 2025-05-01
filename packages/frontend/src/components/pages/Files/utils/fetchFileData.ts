import axios from 'axios';
import { DatabaseData } from '../components/NewTreeView/types';
import banbury from '@banbury/core';

export const fetchFileData = async (
    username: string,
    global_file_path: string,
    {
        setIsLoading,
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
            `${banbury.config.url}/files/get_files_from_filepath/${username}/`,
            {
                global_file_path: global_file_path
            }
        );

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
    } finally {
        setIsLoading(false);
    }
} 
