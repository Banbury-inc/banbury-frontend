import * as React from 'react';
import { Typography, Box, Skeleton } from '@mui/material';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import GrainIcon from '@mui/icons-material/Grain';
import DevicesIcon from '@mui/icons-material/Devices';
import FolderIcon from '@mui/icons-material/Folder';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam'; import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import DescriptionIcon from '@mui/icons-material/Description';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { buildTree } from './utils/buildTree';
import { fetchFileData } from '../../utils/fetchFileData'
import { DatabaseData } from './types';
import { handleNodeSelect } from './handleNodeSelect';
import { fileWatcherEmitter } from '@banbury/core/src/device/watchdog';


function getIconForKind(kind: string) {
  switch (kind) {
    case 'Core':
      return <GrainIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'Device':
      return <DevicesIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'Folder':
      return <FolderIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'Image':
      return <ImageIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'Video':
      return <VideocamIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'Audio':
      return <AudiotrackIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'Document':
      return <DescriptionIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    default:
      return <FolderIcon style={{ marginRight: 5 }} fontSize="inherit" />;
  }
}



export default function FileTreeView({ filePath, setFilePath, filePathDevice, setFilePathDevice }: { filePath: string, setFilePath: (filePath: string) => void, filePathDevice: string, setFilePathDevice: (filePathDevice: string) => void }) {
  const { updates, set_Files, username, setFirstname, setLastname } = useAuth();
  const [fileRows, setFileRows] = useState<DatabaseData[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<DatabaseData[]>([]);
  const disableFetch = false;
  const cache = new Map<string, DatabaseData[]>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndUpdateFiles = async () => {
      const new_files = await fetchFileData(
        username || '',
        filePath || '',
        {
          setFirstname,
          setLastname,
          setFileRows,
          setIsLoading,
          cache,
          existingFiles: fetchedFiles,
        },
      );



      if (new_files) {
        // Create a Map to store unique files
        const uniqueFilesMap = new Map<string, DatabaseData>();

        // Add existing fetched files to the Map
        fetchedFiles.forEach(file => {
          const uniqueKey = `${file.file_path}-${file.device_name}`;
          uniqueFilesMap.set(uniqueKey, file);
        });

        // Add new files to the Map (will automatically overwrite duplicates)
        new_files.forEach(file => {
          const uniqueKey = `${file.file_path}-${file.device_name}`;
          uniqueFilesMap.set(uniqueKey, file);
        });


        // Convert Map back to array
        const updatedFiles = Array.from(uniqueFilesMap.values());

        setFetchedFiles(updatedFiles);
        const treeData = buildTree(updatedFiles);
        setFileRows(treeData);
        set_Files(updatedFiles);
      }
    };

    fetchAndUpdateFiles();
  }, [username, disableFetch, updates, filePath]);


  useEffect(() => {
    const fetchAndUpdateFiles = async () => {
      const new_files = await fetchFileData(
        username || '',
        filePath || '',
        {
          setFirstname,
          setLastname,
          setFileRows,
          setIsLoading,
          cache,
          existingFiles: fetchedFiles,
        },
      );




      if (new_files) {
        let updatedFiles: DatabaseData[] = [];
        updatedFiles = [...fetchedFiles, ...new_files];
        setFetchedFiles(updatedFiles);

        const treeData = buildTree(updatedFiles);
        setFileRows(treeData);
        set_Files(updatedFiles);
      }
    };

    fetchAndUpdateFiles();
  }, [username, disableFetch, updates, filePath]);


  useEffect(() => {
    const handleFileChange = async () => {
      const new_files = await fetchFileData(
        username || '',
        filePath || '',
        {
          setFirstname,
          setLastname,
          setFileRows,
          setIsLoading,
          cache,
          existingFiles: fetchedFiles,
        },
      );

      if (new_files) {
        const updatedFiles = [...fetchedFiles, ...new_files];
        setFetchedFiles(updatedFiles);

        const treeData = buildTree(updatedFiles);
        setFileRows(treeData);
        set_Files(updatedFiles);
      }
    };

    fileWatcherEmitter.on('fileChanged', handleFileChange);
    return () => {
      fileWatcherEmitter.off('fileChanged', handleFileChange);
    };
  }, [username, disableFetch]);


  // Monitor changes to global_file_path in useEffect
  useEffect(() => {
    if (filePath) {
      console.log('Global file path has been updated:', filePath);
    }
  }, [filePath]);

  useEffect(() => {
    if (filePathDevice) {
      console.log('Global file path device has been updated:', filePathDevice);
    }
  }, [filePathDevice]);


  const renderTreeItems = useCallback((nodes: DatabaseData[]) => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.id.toString()}
        onClick={() => handleNodeSelect(setFilePath, fileRows, setFilePathDevice, node.id)}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            {getIconForKind(node.kind)}
            <Typography
              variant="inherit"
              sx={{
                ml: 1,
                mt: 0.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 'calc(100% - 24px)',
              }}
            >
              {node.file_name}
            </Typography>
          </Box>
        }
      >
        {node.children && renderTreeItems(node.children)}
      </TreeItem>
    ));
  }, [fileRows, setFilePath, setFilePathDevice]);

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {isLoading ? (
        <>
          <Skeleton variant="rectangular" height={28} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={28} sx={{ mb: 1, ml: 2 }} />
          <Skeleton variant="rectangular" height={28} sx={{ mb: 1, ml: 2 }} />
          <Skeleton variant="rectangular" height={28} sx={{ mb: 1, ml: 4 }} />
          <Skeleton variant="rectangular" height={28} sx={{ mb: 1, ml: 4 }} />
        </>
      ) : (
        <TreeView
          aria-label="file system navigator"
          sx={{ width: '100%', flexGrow: 1, overflow: 'auto' }}
        >
          {renderTreeItems(fileRows)}
        </TreeView>
      )}
    </Box>
  )

}



