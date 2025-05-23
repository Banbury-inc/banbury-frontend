import React, { useState } from 'react';
import { Card, CardContent, Stack } from '@mui/material';
import { FileViewerTabs } from './FileViewerTabs';

const Files: React.FC = () => {
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const handleFileViewer = () => {
    setShowFileViewer(!showFileViewer);
  };

  const openTab = (tab) => {
    setOpenTabs([...openTabs, tab]);
    setActiveTab(openTabs.length);
  };

  const closeTab = (index) => {
    const newTabs = openTabs.filter((_, i) => i !== index);
    setOpenTabs(newTabs);
    if (index === activeTab) {
      setActiveTab(newTabs.length > 0 ? newTabs.length - 1 : 0);
    }
  };

  const switchTab = (index) => {
    setActiveTab(index);
  };

  return (
    <Stack direction="row" spacing={2}>
      {/* File Viewer Pane */}
      {showFileViewer && (
        <Card
          variant="outlined"
          sx={{
            width: '40%',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: 0
          }}
        >
          <CardContent sx={{
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            padding: 0,
            '&:last-child': { pb: 0 },
            display: 'flex',
            flexDirection: 'column'
          }}>
            <FileViewerTabs
              openTabs={openTabs}
              activeTab={activeTab}
              onCloseTab={closeTab}
              onSwitchTab={switchTab}
            />
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

export default Files; 