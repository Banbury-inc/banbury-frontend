import React, { useCallback } from 'react';
import {
  Box,
  Button,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { shell } from 'electron';
import { Text } from '../Text/Text';
import { Tabs } from '../Tabs/Tabs';
import PDFViewer from './PDFViewer/PDFViewer';
import WordViewer from './WordViewer/WordViewer';
import CodeViewer from './CodeViewer/CodeViewer';
import ImageViewer from './ImageViewer/ImageViewer';
import ExcelViewer from './ExcelViewer/ExcelViewer';
import VideoViewer from './VideoViewer/VideoViewer';
import { isPdfFile, isWordFile, isCodeFile, isExcelFile, isCsvFile, isVideoFile, isImageFile } from '../../pages/Files/utils/fileUtils';

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
  documentActions?: any;
  onDocumentEditorChange?: (editor: any, content: string, fileName: string) => void;
}

const FileViewerTabs: React.FC<FileViewerTabsProps> = React.memo(({
  openTabs,
  activeTab,
  onCloseTab,
  onSwitchTab,
  documentActions,
  onDocumentEditorChange
}) => {

  if (openTabs.length === 0) {
    return null;
  }

  const currentTab = openTabs.find(tab => tab.id === activeTab);

  const handleOpenWithSystemApp = useCallback((filePath: string) => {
    shell.openPath(filePath);
  }, []);

  const renderFileContent = useCallback((tab: FileTab) => {
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
            documentActions={documentActions}
            onDocumentEditorChange={onDocumentEditorChange}
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
        <Text className="text-lg font-semibold mb-4">
          File Type Not Supported
        </Text>
        <Text className="text-gray-500">
          In-app viewing for {tab.fileType} files is not yet supported.
        </Text>
        <Text className="text-gray-500 mt-2">
          Click the button below to open with your system's default application.
        </Text>
      </Box>
    );
  }, []);

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
      }}>
        <Box sx={{ 
          flexGrow: 1,
          '& .tab': {
            marginTop: '0 !important'
          }
        }}>
          <Tabs
            tabs={openTabs.map(tab => ({
              id: tab.id,
              label: tab.fileName,
              path: tab.filePath
            }))}
            activeTab={activeTab || ''}
            onTabChange={(tabId: string) => onSwitchTab(tabId)}
            onTabClose={(tabId: string) => onCloseTab(tabId)}
          />
        </Box>
        
        {/* System App Button for Current Tab */}
        {currentTab && (
          <Button
            onClick={() => handleOpenWithSystemApp(currentTab.filePath)}
            sx={{ 
              paddingLeft: '4px', 
              paddingRight: '4px', 
              marginRight: '8px',
              minWidth: '30px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
            title="Open with system app"
          >
            <OpenInNewIcon fontSize="inherit" />
          </Button>
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
}, (prevProps, nextProps) => {
  // Only re-render if openTabs, activeTab, onCloseTab, or onSwitchTab actually change
  return (
    JSON.stringify(prevProps.openTabs) === JSON.stringify(nextProps.openTabs) &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.onCloseTab === nextProps.onCloseTab &&
    prevProps.onSwitchTab === nextProps.onSwitchTab &&
    prevProps.documentActions === nextProps.documentActions &&
    prevProps.onDocumentEditorChange === nextProps.onDocumentEditorChange
  );
});

export default FileViewerTabs; 
