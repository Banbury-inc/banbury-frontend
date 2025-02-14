import { useEffect, useState } from 'react';
import { fetchSharedFilesData } from '../utils/fetchSharedFilesData';


export const newUseFileData = (
  username: string | null,
  updates: number,
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const shared_files_data = await fetchSharedFilesData(username || '', {
          setSharedFiles,
          setIsLoading,
        });

        if (Array.isArray(shared_files_data) && shared_files_data.length > 0) {
          console.log('Received shared files data:', shared_files_data);
          
          const transformedFiles = shared_files_data.map((file: any) => ({
            _id: file._id || `file-${Math.random()}`,
            file_name: file.file_name,
            file_size: file.file_size || '0',
            file_path: file.file_path,
            device_ids: file.shared_with ? [file.shared_with] : [],
            is_public: file.is_public,
            date_uploaded: file.date_uploaded,
            date_modified: file.date_modified,
            file_parent: file.file_parent,
            original_device: file.original_device,
            available: file.available,
            file_priority: 0,
            owner: file.owner,
            device_name: file.device_name || 'Unknown Device',
            deviceID: file.device_id || file.deviceID || '',
            kind: 'file',
            file_type: 'file',
          }));
          
          console.log('Transformed files:', transformedFiles);
          setSharedFiles(transformedFiles);
        } else {
          console.warn('No shared files data received or invalid format');
          setSharedFiles([]);
        }
      } catch (error) {
        console.error('Error in fetchInitialData:', error);
        setSharedFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      fetchInitialData();
    }
  }, [username, updates]);

  return { isLoading, sharedFiles, setSharedFiles };
};


