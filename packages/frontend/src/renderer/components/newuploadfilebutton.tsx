import * as React from 'react';
import { useState } from 'react';
import { styled } from '@mui/material/styles';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import LoadingButton from '@mui/lab/LoadingButton';
import Tooltip from '@mui/material/Tooltip';
import { handlers } from '../handlers'

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const NewInputFileUploadButton: React.FC = () => {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) {
      console.log("No file selected.");
      return;
    }

    console.log("File:", file);
    // Log the file name for debugging purposes
    console.log("Selected file:", file.name);

    try {
      setLoading(true);
      await handlers.files.uploadFile(file.path);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState<boolean>(false);

  return (
    <Tooltip title="Upload file">
      <LoadingButton 
        component="label"
        data-testid="upload-file-button"
        loading={loading}
        loadingPosition="end"
        sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
      >
        <FileUploadIcon
          fontSize="inherit"
        />
        <VisuallyHiddenInput
          data-testid="file-input"
          type="file"
          onChange={handleFileChange}
          accept="*/*"
          disabled={loading}
        />
      </LoadingButton>
    </Tooltip>
  );
};

export default NewInputFileUploadButton;

