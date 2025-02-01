import * as React from 'react';
import { Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import GrainIcon from '@mui/icons-material/Grain';
import DevicesIcon from '@mui/icons-material/Devices';
import FolderIcon from '@mui/icons-material/Folder';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam'; import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import DescriptionIcon from '@mui/icons-material/Description';

import { fileWatcherEmitter } from '../../../neuranet/device/watchdog';

import path from 'path';
import os from 'os';

const file_name: string = 'treeview_data_snapshot.json';
const directory_name: string = 'BCloud';
const directory_path: string = path.join(os.homedir(), directory_name);
const snapshot_json: string = path.join(directory_path, file_name);
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { buildTree } from './utils/buildTree';
import { fetchData } from './utils/fetchData';
import { DatabaseData } from './types';



const EventEmitter = require('events');




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



export default function CustomizedTreeView() {
  const { updates, files, set_Files, setUpdates, global_file_path, global_file_path_device, username, setFirstname, setLastname, setGlobal_file_path, setGlobal_file_path_device } = useAuth();
  const [fileRows, setFileRows] = useState<DatabaseData[]>([]);
  const [expanded, setExpanded] = useState<string[]>(['core']);
  const [allFiles, setAllFiles] = useState<DatabaseData[]>([]);
  const [disableFetch, setDisableFetch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const file_name: string = 'mmills_database_snapshot.json';
  const directory_name: string = 'BCloud';
  const directory_path: string = path.join(os.homedir(), directory_name);
  const snapshot_json: string = path.join(directory_path, file_name);

  useEffect(() => {
    fetchData(
      username,
      disableFetch,
      snapshot_json,
      {
        setFirstname,
        setLastname,
        setFileRows,
        setAllFiles,
        set_Files,
      },
      buildTree
    );
  }, [username, disableFetch, updates]);

  useEffect(() => {
    const handleFileChange = () => {
      console.log('File changed, fetching data from file tree...');
      setIsLoading(true);
      fetchData(
        username,
        disableFetch,
        snapshot_json,
        {
          setFirstname,
          setLastname,
          setFileRows,
          setAllFiles,
          set_Files,
          setIsLoading,
        },
        buildTree
      );
    };

    fileWatcherEmitter.on('fileChanged', handleFileChange);
    return () => {
      fileWatcherEmitter.off('fileChanged', handleFileChange);
    };
  }, [username, disableFetch]);

  const handleNodeSelect = (event: React.SyntheticEvent, nodeId: string) => {
    const findNodeById = (nodes: DatabaseData[], id: any): DatabaseData | null => {
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
    if (selectedNode) {
      console.log('Selected node file path:', selectedNode.file_path);
      console.log('Selected node device name:', selectedNode.device_name);

      if (global_file_path !== selectedNode.file_path || global_file_path_device !== selectedNode.device_name) {
        // Set the global file path and device
        setGlobal_file_path(selectedNode.file_path);
        setGlobal_file_path_device(selectedNode.device_name);

        // Log the node information but not the global_file_path (since it's async)
        console.log('Setting global file path:', selectedNode.file_path);
      }
    }
  };

  // Monitor changes to global_file_path in useEffect
  useEffect(() => {
    if (global_file_path) {
      console.log('Global file path has been updated:', global_file_path);
    }
  }, [global_file_path]);

  useEffect(() => {
    if (global_file_path_device) {
      console.log('Global file path device has been updated:', global_file_path_device);
    }
  }, [global_file_path_device]);

  const renderTreeItems = useCallback((nodes: DatabaseData[]) => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        nodeId={node.id}
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
  }, []);

  return (
    <Box sx={{ width: 300, height: '100%', overflow: 'auto' }}>
      <TreeView
        aria-label="file system navigator"
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        sx={{ width: '100%', flexGrow: 1, overflow: 'auto' }}
        onNodeSelect={handleNodeSelect}
      >
        {renderTreeItems(fileRows)}
      </TreeView>
    </Box>
  )

}



