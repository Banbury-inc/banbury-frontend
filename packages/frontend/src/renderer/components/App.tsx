import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import React, { useState } from "react";
import theme from "../theme";
import { BrowserRouter } from "react-router-dom";
import Login from "./pages/Login/Login";
import { AuthProvider } from "../context/AuthContext";
import { ipcRenderer } from 'electron';
import './index.css';
import { AlertProvider } from '../context/AlertContext';
import { Alert } from '../../components/alert';
import { useAlert } from '../context/AlertContext';

function AlertWrapper() {
  const { alert } = useAlert();

  if (!alert.show) return null;

  return (
    <Alert
      title={alert.title}
      messages={alert.messages}
      variant={alert.variant}
      isVisible={alert.isVisible}
    />
  );
}

interface TitleBarProps {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

const CustomTitleBar: React.FC<TitleBarProps> = ({ onClose, onMinimize, onMaximize }) => {
  const isMac = process.platform === 'darwin';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 400,
      width: '100%',
      height: '40px',
      backgroundColor: '#212121',
      borderBottom: '1px solid #424242',
      display: 'flex',
      alignItems: 'center',
      justifyContent: isMac ? 'flex-start' : 'space-between',
      '-webkit-app-region': 'drag',
      userSelect: 'none',
    }}>
      {isMac && (
        <div style={{
          marginLeft: '80px',
          display: 'flex',
          gap: '16px',
          height: '100%',
          alignItems: 'center',
          '-webkit-app-region': 'no-drag'
        }}>
          {/* Mac-specific controls go here */}
        </div>
      )}
    </div>
  );
};


declare module 'react' {
  interface CSSProperties {
    '-webkit-app-region'?: 'drag' | 'no-drag';
  }
}

export default function App(): JSX.Element {
  const handleClose = () => {
    ipcRenderer.send('close-window');
  };

  const handleMinimize = () => {
    ipcRenderer.send('minimize-window');
  };

  const handleMaximize = () => {
    ipcRenderer.send('maximize-window');
  };

  return (
    <ThemeProvider theme={theme}>
      <AlertProvider>
        <CustomTitleBar
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
        />
        <AlertWrapper />
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Box
              sx={{
                backgroundColor: (theme) => theme.palette.background.default,
              }}
            >
              <main>
                 <Login /> 
              </main>
            </Box>
          </AuthProvider>
        </BrowserRouter>
      </AlertProvider>
    </ThemeProvider>
  );
}

