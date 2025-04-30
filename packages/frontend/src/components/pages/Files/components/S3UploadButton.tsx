import React, { useRef, useState } from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../renderer/context/AlertContext';
import banbury from '@banbury/core';

interface S3UploadButtonProps {
  filePath?: string;
  onUploadComplete?: () => void;
}

const S3UploadButton: React.FC<S3UploadButtonProps> = ({ filePath = '', onUploadComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { username, devices } = useAuth();
  const { showAlert } = useAlert();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const deviceName = devices && devices.length > 0 ? devices[0].device_name : '';
      if (!deviceName) {
        throw new Error('No device found');
      }

      const fileArray = Array.from(files);
      const results = await banbury.files.uploadMultipleToS3(
        username || '', 
        fileArray, 
        deviceName, 
        filePath
      );
      
      // Check if any uploads failed
      const failedUploads = results.filter(result => result.error);
      
      if (failedUploads.length > 0) {
        showAlert('Upload Failed', ['Some files failed to upload to S3.'], 'error');
      } else {
        showAlert('Upload Complete', ['Files successfully uploaded to S3.'], 'success');
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (error) {
      console.error('Error uploading files to S3:', error);
      showAlert('Upload Error', [(error as Error).message || 'Failed to upload files to S3.'], 'error');
    } finally {
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple
      />
      <Tooltip title="Upload to S3">
        <Button
          onClick={handleButtonClick}
          disabled={uploading}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <CloudUploadIcon fontSize="inherit" />
        </Button>
      </Tooltip>
    </>
  );
};

export default S3UploadButton; 
