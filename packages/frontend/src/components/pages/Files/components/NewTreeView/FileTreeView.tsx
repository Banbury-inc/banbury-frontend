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
import { buildGoogleDriveTree } from './utils/buildTree';
import { googleDriveService } from '../../services/googleDriveService';

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
    case 'GoogleDrive':
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

// Add the Google Drive node to the tree data (only if integration is enabled)
const addGoogleDriveNode = (fileRows: DatabaseData[], googleDriveFiles: any[] = [], googleDriveEnabled: boolean = false): DatabaseData[] => {
  // Don't add Google Drive node if integration is disabled
  if (!googleDriveEnabled) {
    return fileRows;
  }

  // Find the Core node
  const coreNodeIndex = fileRows.findIndex(node => node.id === 'Core');
  
  if (coreNodeIndex >= 0) {
    // Create a copy of the fileRows
    const updatedFileRows = [...fileRows];
    
    // Find existing Google Drive node or create it
    let googleDriveNodeIndex = updatedFileRows[coreNodeIndex].children?.findIndex(child => child.id === 'GoogleDrive');
    
    if (googleDriveNodeIndex === -1 || googleDriveNodeIndex === undefined) {
      // Ensure the children array exists
      if (!updatedFileRows[coreNodeIndex].children) {
        updatedFileRows[coreNodeIndex].children = [];
      }
      
      // Add the Google Drive node as a child of Core
      const googleDriveNode: DatabaseData = {
        id: 'GoogleDrive',
        _id: 'GoogleDrive',
        file_name: 'Google Drive',
        file_parent: 'Core',
        kind: 'GoogleDrive',
        device_name: '',
        date_uploaded: '',
        file_path: 'Core/GoogleDrive',
        file_size: '0',
        file_type: '',
        shared_with: [],
        is_public: false,
        deviceID: '',
        helpers: 0,
        available: '',
        original_device: '',
        children: []
      };
      
      updatedFileRows[coreNodeIndex].children.push(googleDriveNode);
      googleDriveNodeIndex = updatedFileRows[coreNodeIndex].children.length - 1;
    }
    
    // Update Google Drive files as children
    if (updatedFileRows[coreNodeIndex].children && googleDriveNodeIndex >= 0) {
      if (googleDriveFiles.length > 0) {
        // If we have files, populate with actual Google Drive files
        const googleDriveTreeFiles = buildGoogleDriveTree(googleDriveFiles);
        updatedFileRows[coreNodeIndex].children[googleDriveNodeIndex].children = googleDriveTreeFiles;
      } else {
        // Always add at least one child to make the node expandable
        // This ensures the arrow shows up immediately when Google Drive is enabled
        const expandableIndicator: DatabaseData = {
          id: 'GoogleDrive-expandable',
          _id: 'GoogleDrive-expandable',
          file_name: 'Loading...',
          file_parent: 'GoogleDrive',
          kind: 'Folder',
          device_name: '',
          date_uploaded: '',
          file_path: 'Core/GoogleDrive/expandable',
          file_size: '0',
          file_type: 'directory',
          shared_with: [],
          is_public: false,
          deviceID: '',
          helpers: 0,
          available: '',
          original_device: '',
          children: undefined
        };
        updatedFileRows[coreNodeIndex].children[googleDriveNodeIndex].children = [expandableIndicator];
      }
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
  setForwardHistory,
  googleDriveFiles = [],
  googleDriveEnabled = false
}: { 
  filePath: string, 
  setFilePath: (filePath: string) => void, 
  filePathDevice: string, 
  setFilePathDevice: (filePathDevice: string) => void,
  setBackHistory: React.Dispatch<React.SetStateAction<string[]>>,
  setForwardHistory: React.Dispatch<React.SetStateAction<string[]>>,
  googleDriveFiles?: any[],
  googleDriveEnabled?: boolean
}) {
  const { set_Files, username, setFirstname, setLastname, devices } = useAuth();
  const [fileRows, setFileRows] = useState<DatabaseData[]>([]);
  const [fetchedFiles, setFetchedFiles] = useState<DatabaseData[]>([]);
  const disableFetch = false;
  const cache = new Map<string, DatabaseData[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['Core']);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  // Store loaded Google Drive folder contents
  const [googleDriveFolderContents, setGoogleDriveFolderContents] = useState<Map<string, any[]>>(new Map());

  // Handle Google Drive folder expansion
  const handleGoogleDriveFolderToggle = async (nodeId: string, node: DatabaseData) => {
    // Only handle Google Drive folders
    if (node.source !== 'google_drive' && !node.file_path?.includes('Core/GoogleDrive/')) {
      return false;
    }

    // If it's a file, don't handle expansion
    if (node.kind === 'File') {
      return false;
    }

    // Check if this folder's contents are already loaded
    const folderCacheKey = node.google_drive_id || node.id.toString();
    if (googleDriveFolderContents.has(folderCacheKey)) {
      return true; // Already loaded, let normal expansion happen
    }

    // Load folder contents
    setLoadingFolders(prev => new Set(prev.add(nodeId)));
    
    try {
      const result = await googleDriveService.getFiles(
        node.google_drive_id || node.id.toString(),
        node.file_path,
        username || undefined
      );
      
      // Store the loaded contents
      setGoogleDriveFolderContents(prev => new Map(prev.set(folderCacheKey, result.files)));
      
      // Update the tree structure with the new children
      setFileRows(prevFileRows => {
        return updateGoogleDriveFolderInTree(prevFileRows, nodeId, result.files);
      });
      
      return true;
    } catch (error) {
      console.error('Error loading Google Drive folder contents:', error);
      return false;
    } finally {
      setLoadingFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  };

  // Helper function to update a specific Google Drive folder in the tree
  const updateGoogleDriveFolderInTree = (tree: DatabaseData[], nodeId: string, folderFiles: any[]): DatabaseData[] => {
    const updateNode = (nodes: DatabaseData[]): DatabaseData[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          // Convert folder files to tree nodes
          const children = folderFiles.map(file => ({
            _id: file.id,
            id: `gdrive-${file.id}`,
            file_type: file.kind === 'Folder' ? 'directory' : 'file',
            file_name: file.file_name,
            file_size: file.file_size?.toString() || '0',
            file_path: `${node.file_path}/${file.file_name}`,
            shared_with: [],
            is_public: file.is_public || false,
            kind: file.kind,
            file_parent: node.id,
            date_uploaded: file.date_uploaded || '',
            helpers: 0,
            available: 'Available',
            deviceID: 'google-drive',
            device_name: 'Google Drive',
            children: file.kind === 'Folder' ? [] : undefined,
            original_device: 'Google Drive',
            google_drive_id: file.id,
            source: 'google_drive'
          }));

          return {
            ...node,
            children: children
          };
        }

        if (node.children) {
          return {
            ...node,
            children: updateNode(node.children)
          };
        }

        return node;
      });
    };

    return updateNode(tree);
  };

  // Custom node select handler
  const handleCustomNodeSelect = async (nodeId: string) => {
    const findNodeById = (nodes: DatabaseData[], id: string): DatabaseData | null => {
      for (const node of nodes) {
        if (node.id === id) {
          return node;
        }
        if (node.children) {
          const childNode = findNodeById(node.children, id);
          if (childNode) {
            return childNode;
          }
        }
      }
      return null;
    };

    const selectedNode = findNodeById(fileRows, nodeId);
    if (!selectedNode) return;

    // Handle Google Drive expandable indicator click or main Google Drive click when only expandable indicator exists
    if (nodeId === 'GoogleDrive-expandable' || 
        (nodeId === 'GoogleDrive' && selectedNode.children?.length === 1 && selectedNode.children[0].id === 'GoogleDrive-expandable')) {
      // Load root Google Drive files
      setLoadingFolders(prev => new Set(prev.add('GoogleDrive')));
      
      try {
        const result = await googleDriveService.getFiles(
          undefined, // Root folder
          'Core/GoogleDrive',
          username || undefined
        );
        
        // Update the Google Drive node with actual files
        setFileRows(prevFileRows => {
          return updateGoogleDriveFolderInTree(prevFileRows, 'GoogleDrive', result.files);
        });
        
        // Expand the Google Drive node to show the loaded files
        setExpandedNodes(prev => {
          if (!prev.includes('GoogleDrive')) {
            return [...prev, 'GoogleDrive'];
          }
          return prev;
        });
        
      } catch (error) {
        console.error('Error loading root Google Drive files:', error);
      } finally {
        setLoadingFolders(prev => {
          const newSet = new Set(prev);
          newSet.delete('GoogleDrive');
          return newSet;
        });
      }
      return;
    }

    // Handle Google Drive folder expansion instead of navigation
    if (selectedNode.source === 'google_drive' && selectedNode.kind === 'Folder') {
      const shouldExpand = await handleGoogleDriveFolderToggle(nodeId, selectedNode);
      if (shouldExpand) {
        // Toggle expansion state
        setExpandedNodes(prev => {
          if (prev.includes(nodeId)) {
            return prev.filter(id => id !== nodeId);
          } else {
            return [...prev, nodeId];
          }
        });
      }
      return;
    }

    // For non-Google Drive nodes or Google Drive files, use normal navigation
    handleNodeSelect(
      setFilePath,
      fileRows,
      setFilePathDevice,
      nodeId,
      filePath,
      setBackHistory,
      setForwardHistory
    );
  };

  // Main effect to fetch and update files - consolidated from the three duplicate effects
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
        // Add Google Drive node to the tree with actual files
        treeData = addGoogleDriveNode(treeData, googleDriveFiles, googleDriveEnabled);
        setFileRows(treeData);
        set_Files(updatedFiles);
        setIsLoading(false);
      }
    };

    fetchAndUpdateFiles();
  }, [username, disableFetch, filePath, devices, googleDriveFiles, googleDriveEnabled]);

  // File watcher effect - separate from main fetch logic
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
        // Add Google Drive node to the tree with actual files
        treeData = addGoogleDriveNode(treeData, googleDriveFiles, googleDriveEnabled);
        setFileRows(treeData);
        set_Files(updatedFiles);
      }
    };

    fileWatcherEmitter.on('fileChanged', handleFileChange);
    return () => {
      fileWatcherEmitter.off('fileChanged', handleFileChange);
    };
  }, [username, disableFetch, devices, googleDriveFiles, googleDriveEnabled]);

  const renderTreeItems = useCallback((nodes: DatabaseData[]) => {
    return nodes.map((node) => {
      const isLoading = loadingFolders.has(node.id);
      
      return (
        <TreeItem
          key={node.id}
          data-testid={`file-tree-item-${node.id}`}
          itemId={node.id.toString()}
          onClick={() => handleCustomNodeSelect(node.id)}
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
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Loading...' : node.file_name}
              </Typography>
            </Box>
          }
        >
          {node.children && renderTreeItems(node.children)}
        </TreeItem>
      );
    });
  }, [fileRows, loadingFolders]);

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
          expandedItems={expandedNodes}
          onExpandedItemsChange={(_event, itemIds) => setExpandedNodes(itemIds)}
        >
          {renderTreeItems(fileRows)}
        </TreeView>
      )}
    </Box>
  )
}



