import * as React from 'react';
import { Typography, Box, Skeleton } from '@mui/material';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import GrainIcon from '@mui/icons-material/Grain';
import DevicesIcon from '@mui/icons-material/Devices';
import FolderIcon from '@mui/icons-material/Folder';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam'; import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../../../renderer/context/AuthContext';
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
    case 'DevicesFolder':
      return <DevicesIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'SyncFolder':
      return <SyncIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'SharedFolder':
      return <FolderSharedOutlinedIcon style={{ marginRight: 5 }} fontSize="inherit" />;
    case 'Cloud':
      return <CloudDoneIcon style={{ marginRight: 5 }} fontSize="inherit" />;
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

// Add the S3 Files node to the tree data
const addS3FilesNode = (fileRows: DatabaseData[]): DatabaseData[] => {
  // Find the Core node
  const coreNodeIndex = fileRows.findIndex(node => node.id === 'Core');
  
  if (coreNodeIndex >= 0) {
    // Create a copy of the fileRows
    const updatedFileRows = [...fileRows];
    
    // Create the S3 Files node if Core node exists
    if (!updatedFileRows[coreNodeIndex].children?.some(child => child.id === 'Cloud')) {
      // Ensure the children array exists
      if (!updatedFileRows[coreNodeIndex].children) {
        updatedFileRows[coreNodeIndex].children = [];
      }
      
      // Add the S3 Files node as a child of Core
      updatedFileRows[coreNodeIndex].children.push({
        id: 'Cloud',
        _id: 'Cloud',
        file_name: 'Cloud',
        file_parent: 'Core',
        kind: 'Cloud',
        device_name: '',
        date_uploaded: '',
        file_path: 'Core/Cloud',
        file_size: '0',
        file_type: '',
        shared_with: [],
        is_public: false,
        deviceID: '',
        helpers: 0,
        available: '',
        original_device: ''
      });
    }
    
    return updatedFileRows;
  }
  
  return fileRows;
};

export default function FileTreeView({ 
  filePath, 
  setFilePath, 
  setFilePathDevice,
  setBackHistory,
  setForwardHistory 
}: { 
  filePath: string, 
  setFilePath: (filePath: string) => void, 
  filePathDevice: string, 
  setFilePathDevice: (filePathDevice: string) => void,
  setBackHistory: React.Dispatch<React.SetStateAction<string[]>>,
  setForwardHistory: React.Dispatch<React.SetStateAction<string[]>>
}) {
  const { updates, set_Files, username, setFirstname, setLastname, devices } = useAuth();
  const [fileRows, setFileRows] = useState<DatabaseData[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<DatabaseData[]>([]);
  const disableFetch = false;
  const cache = new Map<string, DatabaseData[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [_expandedNodes, _setExpandedNodes] = useState<string[]>(['Core']);

  useEffect(() => {
    const fetchAndUpdateFiles = async () => {
      const new_files = await fetchFileData(
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
        let treeData = buildTree(updatedFiles, Array.isArray(devices) ? devices : []); // Pass devices
        // Add S3 Files node to the tree
        treeData = addS3FilesNode(treeData);
        setFileRows(treeData);
        set_Files(updatedFiles);
        setIsLoading(false);
      }
    };

    fetchAndUpdateFiles();
  }, [username, disableFetch, updates, filePath, devices]);

  useEffect(() => {
    const fetchAndUpdateFiles = async () => {
      const new_files = await fetchFileData(
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
        let treeData = buildTree(updatedFiles, Array.isArray(devices) ? devices : []); // Pass devices
        // Add S3 Files node to the tree
        treeData = addS3FilesNode(treeData);
        setFileRows(treeData);
        set_Files(updatedFiles);
      }
    };

    fetchAndUpdateFiles();
  }, [username, disableFetch, updates, filePath, devices]);

  useEffect(() => {
    const handleFileChange = async () => {
      const new_files = await fetchFileData(
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
        let treeData = buildTree(updatedFiles, Array.isArray(devices) ? devices : []); // Pass devices
        // Add S3 Files node to the tree
        treeData = addS3FilesNode(treeData);
        setFileRows(treeData);
        set_Files(updatedFiles);
      }
    };

    fileWatcherEmitter.on('fileChanged', handleFileChange);
    return () => {
      fileWatcherEmitter.off('fileChanged', handleFileChange);
    };
  }, [username, disableFetch, devices]);

  const renderTreeItems = useCallback((nodes: DatabaseData[]) => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        data-testid={`file-tree-item-${node.id}`}
        itemId={node.id.toString()}
        onClick={() => handleNodeSelect(
          setFilePath, 
          fileRows, 
          setFilePathDevice, 
          node.id,
          filePath,
          setBackHistory,
          setForwardHistory
        )}
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
  }, [fileRows, setFilePath, setFilePathDevice, filePath, setBackHistory, setForwardHistory]);

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
          defaultExpandedItems={['Core']}
        >
          {renderTreeItems(fileRows)}
        </TreeView>
      )}
    </Box>
  )
}



