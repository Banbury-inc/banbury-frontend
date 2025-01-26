import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import React from "react";
import theme from "../theme";
import { BrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import { AuthProvider } from "../context/AuthContext";
import { ipcRenderer } from 'electron';
import './index.css';
import { AlertProvider } from '../context/AlertContext';
import { Alert } from '../../components/alert';
import { useAlert } from '../context/AlertContext';

// Create a wrapper component to use the error context
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

// Add custom titlebar component
interface TitleBarProps {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

const CustomTitleBar: React.FC<TitleBarProps> = () => {
  const isMac = process.platform === 'darwin';
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0,
      left: 0,
      width: '100%', 
      height: '40px',
      backgroundColor: '#212121',
      borderBottom: '1px solid #424242',
      display: 'flex',
      alignItems: 'center',
      '-webkit-app-region': 'drag' as 'drag',
      zIndex: 9000,
    }}>
      {isMac && (
        <div style={{
          marginLeft: '80px',
          display: 'flex',
          gap: '16px',
          height: '100%',
          alignItems: 'center',
          '-webkit-app-region': 'no-drag' as 'no-drag'
        }}>
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

