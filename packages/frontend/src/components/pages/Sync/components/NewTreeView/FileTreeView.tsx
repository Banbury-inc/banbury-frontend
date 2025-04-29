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
import { useAuth } from '../../../../../renderer/context/AuthContext';
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
  const {setSyncFiles, global_file_path, username} = useAuth();
  const [syncRows, setSyncRows] = useState<DatabaseData[]>([]);
  const disableFetch = false;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const new_synced_files = await fetchFileSyncData(
        username || '',
        global_file_path || '',
      );

      setSyncFiles(new_synced_files || []);
      const treeData = buildTree(new_synced_files || []);
      setSyncRows(treeData);
      setIsLoading(false);
    };

    fetchData();
  }, [username, disableFetch, global_file_path]);

  const renderTreeItems = useCallback((nodes: DatabaseData[]) => {
    return nodes.map((node, index) => (
      <TreeItem
        key={`${node.id}-${index}`}
        itemId={`${node.id.toString()}-${index}`}
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
          {renderTreeItems(syncRows)}
        </TreeView>
      )}
    </Box>
  )
}



