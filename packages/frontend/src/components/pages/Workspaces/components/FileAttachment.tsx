import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import { ToolbarButton } from '../../../common/ToolbarButton/ToolbarButton';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { useAlert } from '../../../../renderer/context/AlertContext';

interface AttachedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
}

interface FileAttachmentProps {
  onFilesChange?: (files: AttachedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
  onFilesChange,
  maxFiles = 10,
  acceptedTypes = ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.xml', '.yaml', '.yml', '.pdf', '.docx', '.doc'],
  disabled = false
}) => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { showAlert } = useAlert();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isAcceptedFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return acceptedTypes.includes(ext);
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: AttachedFile[] = [];

    for (const file of fileArray) {
      // Check file type
      if (!isAcceptedFile(file.name)) {
        showAlert('Invalid File Type', [`File "${file.name}" is not supported. Accepted types: ${acceptedTypes.join(', ')}`], 'warning');
        continue;
      }

      // Check if already attached
      if (attachedFiles.some(f => f.name === file.name)) {
        showAlert('Duplicate File', [`File "${file.name}" is already attached.`], 'warning');
        continue;
      }

      // Check max files limit
      if (attachedFiles.length + validFiles.length >= maxFiles) {
        showAlert('Max Files Reached', [`Maximum ${maxFiles} files allowed.`], 'warning');
        break;
      }

      validFiles.push({
        id: `${Date.now()}_${Math.random()}`,
        name: file.name,
        path: (file as any).path || file.name, // Electron provides path property
        size: file.size,
        type: file.type || 'application/octet-stream'
      });
    }

    if (validFiles.length > 0) {
      const newFiles = [...attachedFiles, ...validFiles];
      setAttachedFiles(newFiles);
      onFilesChange?.(newFiles);
      showAlert('Files Attached', [`${validFiles.length} file(s) attached successfully.`], 'success');
    }
  }, [attachedFiles, acceptedTypes, maxFiles, onFilesChange, showAlert]);

  const removeFile = useCallback((fileId: string) => {
    const newFiles = attachedFiles.filter(f => f.id !== fileId);
    setAttachedFiles(newFiles);
    onFilesChange?.(newFiles);
  }, [attachedFiles, onFilesChange]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset input
    event.target.value = '';
  }, [addFiles]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  }, [disabled, addFiles]);

  return (
    <Box>
      {/* Attachment Button */}
      <Tooltip title="Attach Files">
        <span>
          <ToolbarButton
            {...({ component: "label" } as any)}
            disabled={disabled || attachedFiles.length >= maxFiles}
            sx={{
              paddingLeft: '4px', 
              paddingRight: '4px', 
              minWidth: '30px',
              color: attachedFiles.length > 0 ? 'primary.main' : 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <AttachFileIcon fontSize="inherit" />
            <input
              type="file"
              multiple
              hidden
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
            />
          </ToolbarButton>
        </span>
      </Tooltip>

      {/* Attached Files Display */}
      {attachedFiles.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Stack spacing={1}>
            {attachedFiles.map((file) => (
              <Paper
                key={file.id}
                variant="outlined"
                sx={{
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'grey.50',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => removeFile(file.id)}
                  sx={{ ml: 1 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* Drag and Drop Area (when dragging) */}
      {isDragOver && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              border: 2,
              borderColor: 'primary.main',
              borderStyle: 'dashed',
              backgroundColor: 'background.paper',
            }}
          >
            <AttachFileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" color="primary.main">
              Drop files here to attach
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported: {acceptedTypes.join(', ')}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Global drag listeners */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: isDragOver ? 'auto' : 'none',
          zIndex: isDragOver ? 9998 : -1,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </Box>
  );
};

export default FileAttachment; 