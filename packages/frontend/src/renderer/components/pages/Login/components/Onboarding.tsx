import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../../../context/AuthContext';
import { banbury } from '@banbury/core';
import { handlers } from '../../../../handlers';
import path from 'path';
import os from 'os';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    label: 'Welcome to Banbury',
    description: "We're excited to have you here! Let's get you started with a quick tour.",
  },
  {
    label: 'Add Device',
    description: "First, let's add your current device to Banbury. This will allow you to sync your files across devices.",
  },
  {
    label: 'Scan Device',
    description: "Now, let's scan your device to find files that can be synced. We'll create a default sync folder in your home directory.",
  },
  {
    label: 'Finish',
    description: "You're all set! Your device is now connected to Banbury. Click finish to start using the application.",
  },
];

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(4),
  backgroundColor: '#1a1a1a',
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 600,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(4),
}));

const ButtonGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  maxWidth: 500,
  gap: theme.spacing(2),
  marginTop: theme.spacing(4),
}));

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { username, tasks, setTasks } = useAuth();
  const [deviceAdded, setDeviceAdded] = useState(false);
  const [deviceScanned, setDeviceScanned] = useState(false);

  const handleAddDevice = async () => {
    setLoading(true);
    setError(null);
    let taskInfo: any = null;
    
    try {
      console.log("Handling add device click");
      console.log("Current username:", username); // Debug log for username

      if (!username) {
        throw new Error('No username available. Please try logging in again.');
      }

      const device_name = await banbury.device.name();
      const task_description = 'Adding device ' + device_name;
      taskInfo = await banbury.sessions.addTask(username, task_description, tasks, setTasks);

      try {
        // Make sure we're using the correct endpoint
        const result = await handlers.devices.addDevice(username);

        if (result === 'success') {
          setDeviceAdded(true);
          await banbury.sessions.completeTask(username, taskInfo, tasks, setTasks);
          handleNext();
        } else if (result === 'exists') {
          // If device already exists, we can consider that a success
          setDeviceAdded(true);
          await banbury.sessions.completeTask(username, taskInfo, tasks, setTasks);
          handleNext();
        } else {
          throw new Error('Failed to add device: ' + result);
        }
      } catch (deviceError: any) {
        // Handle specific error cases
        if (deviceError.response?.status === 404) {
          throw new Error('Device registration endpoint not found. Please check server configuration.');
        } else if (deviceError.code === 'ERR_NETWORK') {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (deviceError.code === 'ERR_BAD_REQUEST') {
          throw new Error('Invalid device information provided.');
        } else {
          throw deviceError;
        }
      }
    } catch (error) {
      console.error('Error adding device:', error);
      
      // Set a user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Update task status if we have a taskInfo
      if (taskInfo) {
        await banbury.sessions.failTask(
          username ?? '',
          taskInfo,
          errorMessage,
          tasks,
          setTasks
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScanDevice = async () => {
    setLoading(true);
    setError(null);
    try {
      const defaultDirectory = path.join(os.homedir(), 'BCloud');
      const task_description = 'Setting up default sync directory';
      const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);

      await handlers.devices.addScannedFolder(defaultDirectory, username ?? '');
      await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
      setDeviceScanned(true);
      handleNext();
    } catch (error) {
      console.error('Error scanning device:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      onComplete();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderActionButton = () => {
    switch (activeStep) {
      case 1: // Add Device step
        return (
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleAddDevice}
            disabled={loading || deviceAdded}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Adding Device...' : deviceAdded ? 'Device Added' : 'Add Device'}
          </Button>
        );
      case 2: // Scan Device step
        return (
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleScanDevice}
            disabled={loading || deviceScanned}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Scanning...' : deviceScanned ? 'Device Scanned' : 'Scan Device'}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <StyledContainer maxWidth={false}>
      <ContentWrapper>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ width: '100%' }}>
          {steps.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 500 }}>
          <Typography variant="h4" gutterBottom>
            {steps[activeStep].label}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {steps[activeStep].description}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        <ButtonGroup>
          <Button
            disabled={activeStep === 0 || loading}
            size="small"
            onClick={handleBack}
            sx={{ minWidth: 100 }}
          >
            Back
          </Button>
          
          {renderActionButton()}
          
          <Button
            variant="contained"
            size="small"
            onClick={handleNext}
            disabled={loading}
            sx={{ minWidth: 100 }}
          >
            {activeStep === steps.length - 1 
              ? 'Finish' 
              : activeStep === 0 
                ? 'Next'
                : 'Skip & Continue'}
          </Button>
        </ButtonGroup>
      </ContentWrapper>
    </StyledContainer>
  );
} 
