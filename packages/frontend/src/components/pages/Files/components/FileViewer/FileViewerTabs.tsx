import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { shell } from 'electron';
import ImageViewer from '../ImageViewer/ImageViewer';
import PDFViewer from '../PDFViewer/PDFViewer';
import WordViewer from '../WordViewer/WordViewer';
import ExcelViewer from '../ExcelViewer/ExcelViewer';
import CodeViewer from '../CodeViewer/CodeViewer';
import VideoViewer from '../VideoViewer/VideoViewer';
import { isImageFile, isPdfFile, isWordFile, isExcelFile, isCsvFile, isCodeFile, isVideoFile } from '../../utils/fileUtils';

interface FileTab {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
}

interface FileViewerTabsProps {
  openTabs: FileTab[];
  activeTab: string | null;
  onCloseTab: (tabId: string) => void;
  onSwitchTab: (tabId: string) => void;
}

const FileViewerTabs: React.FC<FileViewerTabsProps> = ({
  openTabs,
  activeTab,
  onCloseTab,
  onSwitchTab
}) => {

  if (openTabs.length === 0) {
    return null;
  }

  const currentTab = openTabs.find(tab => tab.id === activeTab);

  const handleOpenWithSystemApp = (filePath: string) => {
    shell.openPath(filePath);
  };

  const renderFileContent = (tab: FileTab) => {
    if (isImageFile(tab.fileName)) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <ImageViewer
            src={tab.filePath}
            alt={tab.fileName}
            fileName={tab.fileName}
            onError={() => {
              console.error('Failed to load image:', tab.filePath);
            }}
          />
        </Box>
      );
    }

    if (isPdfFile(tab.fileName)) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          overflow: 'hidden'
        }}>
          <PDFViewer
            src={tab.filePath}
            fileName={tab.fileName}
            onError={() => {
              console.error('Failed to load PDF:', tab.filePath);
            }}
          />
        </Box>
      );
    }

    if (isWordFile(tab.fileName)) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          overflow: 'hidden'
        }}>
          <WordViewer
            src={tab.filePath}
            fileName={tab.fileName}
            onError={() => {
              console.error('Failed to load Word document:', tab.filePath);
            }}
          />
        </Box>
      );
    }

    if (isExcelFile(tab.fileName) || isCsvFile(tab.fileName)) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          overflow: 'hidden'
        }}>
          <ExcelViewer
            src={tab.filePath}
            fileName={tab.fileName}
            onError={() => {
              console.error('Failed to load spreadsheet:', tab.filePath);
            }}
          />
        </Box>
      );
    }

    if (isCodeFile(tab.fileName)) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          overflow: 'hidden'
        }}>
          <CodeViewer
            src={tab.filePath}
            fileName={tab.fileName}
            onError={() => {
              console.error('Failed to load code file:', tab.filePath);
            }}
          />
        </Box>
      );
    }

    if (isVideoFile(tab.fileName)) {
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          overflow: 'hidden'
        }}>
          <VideoViewer
            src={tab.filePath}
            fileName={tab.fileName}
            onError={() => {
              console.error('Failed to load video:', tab.filePath);
            }}
          />
        </Box>
      );
    }

    // For non-supported files, show a placeholder
    return (
      <Box sx={{ 
        p: 4, 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        <Typography variant="h6" gutterBottom>
          File Type Not Supported
        </Typography>
        <Typography variant="body2" color="text.secondary">
          In-app viewing for {tab.fileType} files is not yet supported.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Click the button below to open with your system's default application.
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Tab Headers */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        minHeight: 48
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => onSwitchTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            flexGrow: 1,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontSize: '0.875rem'
            }
          }}
        >
          {openTabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  maxWidth: 200
                }}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.fileName}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </Tabs>
        
        {/* System App Button for Current Tab */}
        {currentTab && (
          <IconButton
            onClick={() => handleOpenWithSystemApp(currentTab.filePath)}
            sx={{ mr: 1 }}
            title="Open with system app"
          >
            <OpenInNewIcon />
          </IconButton>
        )}
      </Box>

      {/* Tab Content */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {currentTab && renderFileContent(currentTab)}
      </Box>
    </Box>
  );
};

export default FileViewerTabs; 
