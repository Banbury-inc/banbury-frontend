import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography 
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FileIcon from '@mui/icons-material/InsertDriveFile';
import { useAuth } from '../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../renderer/context/AlertContext';
import banbury from '@banbury/core';
import { formatFileSize } from '../utils/formatFileSize';

interface S3File {
  file_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  date_uploaded: string;
  date_modified: string;
  s3_url: string;
  device_name: string;
}

const S3FilesView: React.FC = () => {
  const [s3Files, setS3Files] = useState<S3File[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { username } = useAuth();
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchS3Files();
  }, []);

  const fetchS3Files = async () => {
    if (!username) return;
    
    setLoading(true);
    try {
      const result = await banbury.files.listS3Files(username);
      if (result && result.files) {
        setS3Files(result.files);
      }
    } catch (error) {
      console.error('Error fetching S3 files:', error);
      showAlert('Error', ['Failed to fetch S3 files. Please try again.'], 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: S3File) => {
    if (!username) return;
    
    setDownloading(file.file_id);
    try {
      await banbury.files.downloadAndSaveS3File(
        username,
        file.file_id,
        file.file_name
      );
      showAlert('Success', [`File "${file.file_name}" downloaded successfully.`], 'success');
    } catch (error) {
      console.error('Error downloading S3 file:', error);
      showAlert('Error', [`Failed to download "${file.file_name}".`], 'error');
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (s3Files.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        p: 3,
        height: '100%' 
      }}>
        <FileIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          No files found in S3 storage
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Upload files using the S3 upload button to see them here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">S3 Files</Typography>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchS3Files}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Device</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {s3Files.map((file) => (
              <TableRow key={file.file_id} hover>
                <TableCell>{file.file_name}</TableCell>
                <TableCell>{formatFileSize(file.file_size)}</TableCell>
                <TableCell>{file.file_type || 'Unknown'}</TableCell>
                <TableCell>{formatDate(file.date_uploaded)}</TableCell>
                <TableCell>{file.device_name}</TableCell>
                <TableCell align="right">
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    startIcon={
                      downloading === file.file_id ? 
                        <CircularProgress size={16} color="inherit" /> : 
                        <CloudDownloadIcon />
                    }
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.file_id}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default S3FilesView; 