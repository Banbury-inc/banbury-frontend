import React from 'react';
import { Card, CardContent, Stack, Grid } from '@mui/material';
import ConversationsButton from './ConversationsButton';
import ModelSelectorButton from './ModelSelectorButton/ModelSelectorButton';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: any[];
  category?: string;
}

interface AIToolbarProps {
  currentModel: string;
  setCurrentModel: (model: string) => void;
  deviceInfo: any;
  handleRefreshDeviceInfo: () => void;
  handleSelectConversation: (conversation: Conversation) => void;
  currentConversation: Conversation | null;
  handleNewChat: () => void;
}

export default function AIToolbar({
  currentModel,
  setCurrentModel,
  deviceInfo,
  handleRefreshDeviceInfo,
  handleSelectConversation,
  currentConversation,
  handleNewChat,
}: AIToolbarProps) {
  return (
    <Card variant="outlined" sx={{
      borderTop: 0,
      borderLeft: 0,
      borderBottom: 0,
      flexShrink: 0,
      borderRadius: 0,
      backgroundColor: (theme) => theme.palette.background.paper
    }}>
      <CardContent sx={{ paddingBottom: '4px !important', paddingTop: '8px !important' }}>
        <Stack spacing={2} direction="row" sx={{
          paddingLeft: 8,
          flexWrap: 'nowrap',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}>
          <Grid container sx={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 1,
            height: '100%',
          }}>
            <Grid item>
              <ConversationsButton
                onSelectConversation={handleSelectConversation}
                currentConversation={currentConversation}
                onNewChat={handleNewChat}
              />
            </Grid>
            <Grid item>
              <ModelSelectorButton
                currentModel={currentModel}
                onModelChange={setCurrentModel}
                deviceInfo={deviceInfo}
                onRefreshDeviceInfo={handleRefreshDeviceInfo}
              />
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
} 