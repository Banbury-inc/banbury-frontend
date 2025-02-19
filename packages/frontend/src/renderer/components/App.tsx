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
  const [isMinimizeHover, setIsMinimizeHover] = useState(false);
  const [isMaximizeHover, setIsMaximizeHover] = useState(false);
  const [isCloseHover, setIsCloseHover] = useState(false);

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
      zIndex: 9000,
      justifyContent: isMac ? 'flex-start' : 'space-between',
      '-webkit-app-region': 'drag' as const,
    }}>
      {isMac ? (
        <div style={{
          marginLeft: '80px',
          display: 'flex',
          gap: '16px',
          height: '100%',
          alignItems: 'center',
          '-webkit-app-region': 'no-drag' as const
        }}>
          {/* Mac-specific controls go here */}
        </div>
      ) : (
        <>
          {/* Left side - draggable area */}
          <div style={{
            flex: 1,
            height: '100%',
            '-webkit-app-region': 'drag' as const
          }} />

          {/* Right side - window controls */}
          <div style={{
            display: 'flex',
            height: '40px',
            alignItems: 'center',
            '-webkit-app-region': 'no-drag' as const,
          }}>
            <button
              onClick={onMinimize}
              className="titlebar-button"
              onMouseEnter={() => setIsMinimizeHover(true)}
              onMouseLeave={() => setIsMinimizeHover(false)}
              style={{
                width: '46px',
                height: '100%',
                border: 'none',
                background: isMinimizeHover ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &#8211;
            </button>
            <button
              onClick={onMaximize}
              className="titlebar-button"
              onMouseEnter={() => setIsMaximizeHover(true)}
              onMouseLeave={() => setIsMaximizeHover(false)}
              style={{
                width: '46px',
                height: '100%',
                border: 'none',
                background: isMaximizeHover ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              &#9633;
            </button>
            <button
              onClick={onClose}
              className="titlebar-button"
              onMouseEnter={() => setIsCloseHover(true)}
              onMouseLeave={() => setIsCloseHover(false)}
              style={{
                width: '46px',
                height: '100%',
                border: 'none',
                background: isCloseHover ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &#10005;
            </button>
          </div>
        </>
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

