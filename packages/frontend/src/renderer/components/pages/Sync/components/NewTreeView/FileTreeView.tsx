import * as React from 'react';
import { Typography, Box } from '@mui/material';
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
import { DatabaseData } from './types';
import { fetchFileSyncData } from '../../utils/fetchFileSyncData';


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
  const {setSyncFiles, global_file_path, global_file_path_device, username} = useAuth();
  const [syncRows, setSyncRows] = useState<DatabaseData[]>([]);
  const disableFetch = false;

  useEffect(() => {
    const fetchData = async () => {
      const new_synced_files = await fetchFileSyncData(
        username || '',
        global_file_path || '',
      );

      setSyncFiles(new_synced_files || []);
      const treeData = buildTree(new_synced_files || []);
      setSyncRows(treeData);
    };

    fetchData();
  }, [username, disableFetch, global_file_path]);

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
        itemId={node.id}
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
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <TreeView
        aria-label="file system navigator"
        sx={{ width: '100%', flexGrow: 1, overflow: 'auto' }}
      // onNodeSelect={handleNodeSelect}
      >
        {renderTreeItems(syncRows)}
      </TreeView>
    </Box>
  )

}



