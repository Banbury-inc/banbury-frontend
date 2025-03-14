import * as React from 'react';
import { useState } from 'react';
import { styled } from '@mui/material/styles';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import LoadingButton from '@mui/lab/LoadingButton';
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

const InputFileUploadButton: React.FC = () => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) {
      console.log("No file selected.");
      return;
    }

    console.log("File:", file);
    // Log the file name for debugging purposes
    console.log("Selected file:", file.name);

    // Run the Python script with the selected file
    runPythonScript(file);
  };

  const [loading, setLoading] = useState<boolean>(false);
  const runPythonScript = async (file: File) => {

    setLoading(true);
    handlers.files.uploadFile(file.path);
    setLoading(false);
  }

  return (
    <LoadingButton component="label"
      variant="outlined"
      size="small"
      loading={loading}
      loadingPosition="end"
      endIcon={<FileUploadIcon />}
    >
      Upload
      <VisuallyHiddenInput
        type="file"
        onChange={handleFileChange}
      // If you want to handle multiple files, you might consider adding the "multiple" attribute
      />
    </LoadingButton>

  );
};

export default InputFileUploadButton;

