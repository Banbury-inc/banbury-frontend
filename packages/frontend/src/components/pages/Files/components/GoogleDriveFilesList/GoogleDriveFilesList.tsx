import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Grid,
  Typography,
  Alert,
  Breadcrumbs,
  Link,
  Fade
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatFileSize } from '../../utils/formatFileSize';
import FileTable from '../Table/Table';
import { ViewType as FileViewType } from '../FilesToolbar/ChangeViewButton/ChangeViewButton';
import { DatabaseData, Order } from '../../types';
import { GoogleDriveFileRow } from '../../services/googleDriveService';
import FileThumbnail from '../FileThumbnail/FileThumbnail';
import GoogleDriveLoadingIndicator from './GoogleDriveLoadingIndicator';
import { googleDriveService } from '../../services/googleDriveService';

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
  updates?: number;
  // New props for Google Drive data
  googleDriveFiles: GoogleDriveFileRow[];
  isGoogleDriveLoading: boolean;
  googleDriveError: string | null;
  googleDriveEnabled: boolean;
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
  setFilePath,
  updates,
  googleDriveFiles,
  isGoogleDriveLoading,
  googleDriveError,
  googleDriveEnabled
}) => {
  if (!googleDriveEnabled) {
    return null;
  }

  if (googleDriveError && googleDriveError.includes('GOOGLE_DRIVE_AUTH_REQUIRED')) {
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

  // Show loading indicator for initial load or error states
  if ((isGoogleDriveLoading && googleDriveFiles.length === 0) || googleDriveError) {
    return (
      <GoogleDriveLoadingIndicator
        isLoading={isGoogleDriveLoading}
        error={googleDriveError}
        hasFiles={googleDriveFiles.length > 0}
        viewType={viewType}
        itemCount={12}
      />
    );
  }

  if (googleDriveFiles.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <FolderOpenIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" color="textSecondary">
          No Google Drive files available.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Your Google Drive appears to be empty or you may need to authenticate.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
          disabled={isGoogleDriveLoading}
        >
          Refresh
        </Button>
      </Box>
    );
  }

  // Convert GoogleDriveFileRow to DatabaseData format for FileTable
  const convertedFiles: DatabaseData[] = googleDriveFiles.map(file => ({
    ...file,
    _id: file.id,
    id: `gdrive-${file.id}`, // Ensure consistent prefixed ID format
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

  // Create sorted Google Drive files for grid view with prefixed IDs
  const sortedGoogleDriveFiles = googleDriveFiles.map(file => ({
    ...file,
    id: `gdrive-${file.id}`, // Ensure consistent prefixed ID format
    google_drive_id: file.id // Keep original ID as google_drive_id
  })).sort((a, b) => {
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
      setFilePath(folderFile.file_path);
    }
  };

  // Override the file name click for folders
  const handleItemClick = async (id: string | number) => {
    // Extract original Google Drive ID if it's a prefixed ID
    const originalId = typeof id === 'string' && id.startsWith('gdrive-') 
      ? id.replace('gdrive-', '') 
      : id;
    
    const file = googleDriveFiles.find(f => f.id === originalId);
    if (!file) return;
    
    if (file.kind === 'Folder') {
      handleFolderClick(file);
    } else {
      // For files, use the original handleFileNameClick with the prefixed ID
      await handleFileNameClick(id);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Files Content */}
      <Fade in={!isGoogleDriveLoading || googleDriveFiles.length > 0} timeout={300}>
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                          borderColor: isItemSelected ? 'primary.main' : 'divider',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onClick={(event) => handleClick(event, row.id)}
                        onDoubleClick={() => {
                          if (row.kind === 'Folder') {
                            handleFolderClick(row);
                          } else {
                            handleItemClick(row.id);
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
                isLoading={false} // We handle loading with our custom indicator
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
        </Box>
      </Fade>
      
      {/* Progressive loading indicator for when more files are being loaded */}
      {isGoogleDriveLoading && googleDriveFiles.length > 0 && (
        <GoogleDriveLoadingIndicator
          isLoading={true}
          error={null}
          hasFiles={true}
          viewType={viewType}
        />
      )}
    </Box>
  );
};

export default GoogleDriveFilesList; 
