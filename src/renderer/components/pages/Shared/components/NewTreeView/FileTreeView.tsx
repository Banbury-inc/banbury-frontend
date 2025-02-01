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


import path from 'path';
import os from 'os';

const file_name: string = 'treeview_data_snapshot.json';
const directory_name: string = 'BCloud';
const directory_path: string = path.join(os.homedir(), directory_name);
const snapshot_json: string = path.join(directory_path, file_name);
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { buildTree } from './utils/buildTree';
import { DatabaseData } from './types';
import { fetchFileSyncData } from '../../utils/fetchFileSyncData';



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



export default function FileTreeView() {
  const { updates, files, set_Files, sync_files, setSyncFiles, setUpdates, global_file_path, global_file_path_device, username, setFirstname, setLastname, setGlobal_file_path, setGlobal_file_path_device } = useAuth();
  const [syncRows, setSyncRows] = useState<DatabaseData[]>([]);
  const [expanded, setExpanded] = useState<string[]>(['core']);
  const [allFiles, setAllFiles] = useState<DatabaseData[]>([]);
  const [disableFetch, setDisableFetch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedFiles, setFetchedFiles] = useState<DatabaseData[]>([]);

  const file_name: string = 'mmills_database_snapshot.json';
  const directory_name: string = 'BCloud';
  const directory_path: string = path.join(os.homedir(), directory_name);
  const snapshot_json: string = path.join(directory_path, file_name);

  const cache = new Map<string, DatabaseData[]>();





  useEffect(() => {
    const fetchData = async () => {
      const new_synced_files = await fetchFileSyncData(
        username || '',
        global_file_path || '',
        {
          setFirstname,
          setLastname,
          setSyncRows,
          setAllFiles,
          setIsLoading,
          cache: new Map(),
        },
      );

      setSyncFiles(new_synced_files || []);
      setFetchedFiles(new_synced_files || []);
      const treeData = buildTree(new_synced_files || []);
      setSyncRows(treeData);
      if (!disableFetch) {
        setAllFiles(treeData);
      }
    };

    fetchData();
  }, [username, disableFetch, global_file_path]);


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

  // const handleNodeSelect = (event: React.SyntheticEvent, nodeId: string) => {
  //   const selectedNode = findNodeById(fileRows, nodeId);
  //   if (selectedNode) {
  //     // Don't set path for root core node
  //     if (selectedNode.id === 'Core') {
  //       setGlobal_file_path(selectedNode.id);
  //       setGlobal_file_path_device('');
  //       return;
  //     }
  //     // Don't set path for main Devices or Cloud Sync nodes
  //     if (selectedNode.id === 'Devices' || selectedNode.id === 'Cloud Sync') {
  //       setGlobal_file_path(`Core/${selectedNode.id}`);
  //       setGlobal_file_path_device('');
  //       return;
  //     }

  //     let newFilePath = '';
  //     setGlobal_file_path(newFilePath);
  //     setGlobal_file_path_device(selectedNode.device_name);


  //   }
  // };

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
      // onNodeSelect={handleNodeSelect}
      >
        {renderTreeItems(syncRows)}
      </TreeView>
    </Box>
  )

}



