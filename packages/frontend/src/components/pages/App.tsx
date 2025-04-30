import { Box, CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import Login from "./Login/Login";
import { AuthProvider } from "../../renderer/context/AuthContext";
import { ipcRenderer } from 'electron';
import '../../renderer/index.css';
import { AlertProvider } from '../../renderer/context/AlertContext';
import { Alert } from '../../components/template/alert';
import { useAlert } from '../../renderer/context/AlertContext';
import { ThemeProvider, useTheme } from "../../renderer/context/ThemeContext";

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

const CustomTitleBar: React.FC<TitleBarProps> = () => {
  const isMac = process.platform === 'darwin';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '38px',
      backgroundColor: 'transparent',
      display: 'flex',
      borderBottom: '#424242 solid 1px',
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

function ThemedApp(): JSX.Element {
  const { theme } = useTheme();
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
    <MuiThemeProvider theme={theme}>
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
    </MuiThemeProvider>
  );
}

export default function App(): JSX.Element {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

