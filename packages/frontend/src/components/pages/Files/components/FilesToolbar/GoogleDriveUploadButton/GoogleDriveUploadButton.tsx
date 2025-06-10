import React, { useRef, useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../../../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../../../renderer/context/AlertContext';
import { uploadMultipleToGoogleDrive } from '@banbury/core/src/files/googleDrive';

interface GoogleDriveUploadButtonProps {
  onUploadComplete?: () => void;
}

const GoogleDriveUploadButton: React.FC<GoogleDriveUploadButtonProps> = ({ 
  onUploadComplete 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { setUpdates } = useAuth();
  const { showAlert } = useAlert();

  // Extract folder ID from current path for Google Drive uploads
  const extractFolderId = (): string | undefined => {
    // This is a simplified implementation
    // In a full implementation, you'd need to map file paths to Google Drive folder IDs
    // For now, we'll upload to the root directory
    return undefined;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const fileArray = Array.from(files);
      const parentFolderId = extractFolderId();
      
      // Upload all files using the multiple upload function
      const results = await uploadMultipleToGoogleDrive(fileArray, parentFolderId);
      
      // Check if any uploads failed by looking for error properties in results
      const failedUploads = results.filter(result => result && result.error);
      
      if (failedUploads.length > 0) {
        console.error('Some uploads failed:', failedUploads);
        if (failedUploads.length === results.length) {
          showAlert('Upload Failed', ['All files failed to upload to Google Drive.'], 'error');
        } else {
          showAlert('Partial Upload Success', ['Some files failed to upload to Google Drive.'], 'warning');
        }
      } else {
        showAlert('Upload Complete', ['Files successfully uploaded to Google Drive.'], 'success');
      }
      
      // Force a refresh of the files list
      setUpdates(Date.now());
      
      // Call the onUploadComplete callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading files to Google Drive:', error);
      showAlert('Upload Error', [(error as Error).message || 'Failed to upload files to Google Drive.'], 'error');
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
      <Tooltip title="Upload to Google Drive">
        <span>
          <Button
            onClick={handleButtonClick}
            disabled={uploading}
            sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
          >
            <CloudUploadIcon fontSize="inherit" />
          </Button>
        </span>
      </Tooltip>
    </>
  );
};

export default GoogleDriveUploadButton; 