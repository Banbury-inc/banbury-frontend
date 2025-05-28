import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useGoogleDriveFiles } from '../../hooks/useGoogleDriveFiles';
import { formatFileSize } from '../../utils/formatFileSize';
import { FolderIcon, DocumentIcon } from '@heroicons/react/20/solid';
import FileTable from '../Table/Table';
import { ViewType as FileViewType } from '../FilesToolbar/ChangeViewButton/ChangeViewButton';
import { DatabaseData, Order } from '../../types';
import { GoogleDriveFileRow } from '../../hooks/useGoogleDriveFiles';
import FileThumbnail from '../FileThumbnail/FileThumbnail';

interface GoogleDriveFilesListProps {
  filePath: string;
  filePathDevice: string;
  viewType: FileViewType;
  order: Order;
  orderBy: keyof DatabaseData;
  selected: readonly (string | number)[];
  page: number;
  rowsPerPage: number;
  hoveredRowId: string | number | null;
  devices: any[];
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof DatabaseData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClick: (event: React.MouseEvent<unknown> | React.ChangeEvent<HTMLInputElement>, id: string | number) => void;
  handleFileNameClick: (id: string | number) => Promise<void>;
  isSelected: (id: string | number) => boolean;
  setHoveredRowId: (id: string | number | null) => void;
  handlePriorityChange: (row: any, newValue: number | null) => Promise<void>;
  columnVisibility: { [key: string]: boolean };
  setFilePath: (path: string) => void;
}

const GoogleDriveFilesList: React.FC<GoogleDriveFilesListProps> = ({
  filePath,
  viewType,
  order,
  orderBy,
  selected,
  page,
  rowsPerPage,
  hoveredRowId,
  devices,
  onRequestSort,
  onSelectAllClick,
  handleClick,
  handleFileNameClick,
  isSelected,
  setHoveredRowId,
  handlePriorityChange,
  columnVisibility,
  setFilePath
}) => {
  const {
    googleDriveFiles,
    isLoading,
    isGoogleDrivePath,
    authRequired,
    loadMoreFiles,
    hasMorePages,
    isLoadingMore,
    navigateToFolder
  } = useGoogleDriveFiles(filePath);

  if (!isGoogleDrivePath) {
    return null;
  }

  if (authRequired) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          <Typography variant="body2">
            Google Drive authentication required. Please connect your Google account to access Drive files.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (isLoading && googleDriveFiles.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (googleDriveFiles.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <FolderOpenIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" color="textSecondary">
          No Google Drive files available.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Your Google Drive appears to be empty or you may need to authenticate.
        </Typography>
      </Box>
    );
  }

  // Convert GoogleDriveFileRow to DatabaseData format for FileTable
  const convertedFiles: DatabaseData[] = googleDriveFiles.map(file => ({
    ...file,
    _id: file.id,
    date_uploaded: file.date_uploaded || '',
    date_modified: file.date_modified || '',
    file_priority: file.file_priority,
    deviceID: '',
    helpers: 0
  }));

  // Sort converted files: folders first, then files
  convertedFiles.sort((a, b) => {
    const aIsFolder = a.kind === 'Folder' || a.file_type === 'directory';
    const bIsFolder = b.kind === 'Folder' || b.file_type === 'directory';
    
    // If one is folder and other is file, folder comes first
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    
    // If both are same type, sort alphabetically
    return a.file_name.localeCompare(b.file_name);
  });

  // Create sorted Google Drive files for grid view
  const sortedGoogleDriveFiles = [...googleDriveFiles].sort((a, b) => {
    const aIsFolder = a.kind === 'Folder';
    const bIsFolder = b.kind === 'Folder';
    
    // If one is folder and other is file, folder comes first
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    
    // If both are same type, sort alphabetically
    return a.file_name.localeCompare(b.file_name);
  });

  // Handle folder navigation
  const handleFolderClick = (folderFile: GoogleDriveFileRow) => {
    if (folderFile.kind === 'Folder') {
      navigateToFolder(folderFile, setFilePath);
    }
  };

  // Override the file name click for folders
  const handleItemClick = async (id: string | number) => {
    const file = googleDriveFiles.find(f => f.id === id);
    if (!file) return;
    
    if (file.kind === 'Folder') {
      handleFolderClick(file);
    } else {
      // For files, use the original handleFileNameClick
      await handleFileNameClick(id);
    }
  };

  // Generate breadcrumb items from current path
  const getBreadcrumbItems = () => {
    const pathParts = filePath.split('/');
    const googleDriveIndex = pathParts.findIndex(part => part === 'GoogleDrive');
    
    if (googleDriveIndex === -1) return [];
    
    const breadcrumbs = [
      {
        label: 'Google Drive',
        path: 'Core/GoogleDrive',
        isRoot: true
      }
    ];
    
    // Add folder breadcrumbs
    if (googleDriveIndex < pathParts.length - 1) {
      const folderParts = pathParts.slice(googleDriveIndex + 1);
      folderParts.forEach((folderName, index) => {
        const folderPath = pathParts.slice(0, googleDriveIndex + 2 + index).join('/');
        breadcrumbs.push({
          label: folderName,
          path: folderPath,
          isRoot: false
        });
      });
    }
    
    return breadcrumbs;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Google Drive Breadcrumb Navigation */}
      {breadcrumbItems.length > 0 && (
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="Google Drive breadcrumb"
          >
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              return isLast ? (
                <Typography key={item.path} color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                  {item.isRoot && <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />}
                  {item.label}
                </Typography>
              ) : (
                <Link
                  key={item.path}
                  underline="hover"
                  color="inherit"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setFilePath(item.path);
                  }}
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  {item.isRoot && <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />}
                  {item.label}
                </Link>
              );
            })}
          </Breadcrumbs>
        </Box>
      )}
      
      {viewType.includes('grid') ? (
        <Box 
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            px: 0.5
          }}
        >
          <Grid container spacing={2} sx={{ p: 1.5 }}>
            {sortedGoogleDriveFiles.map((row) => {
              const isItemSelected = isSelected(row.id);
              return (
                <Grid item xs={viewType === 'grid' ? 1.5 : 3} key={row.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        '& .selection-checkbox': {
                          opacity: 1
                        }
                      },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative',
                      border: isItemSelected ? '2px solid' : '1px solid',
                      borderColor: isItemSelected ? 'primary.main' : 'divider'
                    }}
                    onClick={(event) => handleClick(event, row.id)}
                    onDoubleClick={() => {
                      if (row.kind === 'Folder') {
                        handleFolderClick(row);
                      } else {
                        handleFileNameClick(row.id);
                      }
                    }}
                  >
                    <Box
                      className="selection-checkbox"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        opacity: isItemSelected ? 1 : 0,
                        transition: 'opacity 0.2s',
                        zIndex: 1
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isItemSelected}
                        onChange={(event) => handleClick(event, row.id)}
                        size="small"
                      />
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: 1,
                        m: 1,
                        minHeight: '80px'
                      }}
                    >
                      <FileThumbnail
                        fileName={row.file_name}
                        fileKind={row.kind}
                        thumbnailLink={row.thumbnail_link}
                        filePath={row.file_path}
                        size={viewType === 'grid' ? 'medium' : 'large'}
                        isGoogleDrive={true}
                        fileId={row.id}
                      />
                    </Box>
                    <CardContent sx={{ flexGrow: 1, pt: 0.5, px: 1.5, pb: 1 }}>
                      <Typography variant="body2" noWrap>
                        {row.file_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatFileSize(row.file_size)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: '#1DB954' }}
                      >
                        {row.available}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <FileTable
            fileRows={convertedFiles}
            isLoading={isLoading}
            order={order}
            orderBy={orderBy}
            selected={selected}
            page={page}
            rowsPerPage={rowsPerPage}
            isCloudSync={false}
            hoveredRowId={hoveredRowId}
            _devices={devices}
            onRequestSort={onRequestSort}
            onSelectAllClick={onSelectAllClick}
            handleClick={handleClick}
            handleFileNameClick={handleItemClick}
            isSelected={isSelected}
            setHoveredRowId={setHoveredRowId}
            handlePriorityChange={handlePriorityChange}
            columnVisibility={columnVisibility}
            currentView="google_drive"
          />
        </Box>
      )}
      
      {/* Load More Button */}
      {hasMorePages && (
        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={loadMoreFiles}
            disabled={isLoadingMore}
            startIcon={isLoadingMore ? <CircularProgress size={16} /> : <ExpandMoreIcon />}
            sx={{ minWidth: 120 }}
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
            Showing {sortedGoogleDriveFiles.length} files
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GoogleDriveFilesList; 
