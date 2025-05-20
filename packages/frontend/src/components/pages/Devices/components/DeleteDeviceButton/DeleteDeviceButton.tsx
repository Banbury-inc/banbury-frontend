import React, { useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import type { AlertVariant } from '../../../../../renderer/context/AlertContext';
import { handleDeleteDeviceClick } from './handleDeleteDeviceClick';

interface DeleteDeviceButtonProps {
  selectedDevice: any;
  selectedDeviceNames: string[];
  setSelectedDeviceNames: (names: string[]) => void;
  setTaskbox_expanded: (value: boolean) => void;
  setTasks: (tasks: any) => void;
  showAlert: (title: string, messages: string[], variant?: AlertVariant) => void;
  tasks: any;
  setAllDevices: (devices: any[]) => void;
  setIsLoading: (value: boolean) => void;
  setSelectedDevice: (device: any) => void;
}

const DeleteDeviceButton: React.FC<DeleteDeviceButtonProps> = ({
  selectedDevice,
  selectedDeviceNames,
  setSelectedDeviceNames,
  setTaskbox_expanded,
  setTasks,
  showAlert,
  tasks,
  setAllDevices,
  setIsLoading,
  setSelectedDevice,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await handleDeleteDeviceClick(
        selectedDevice,
        selectedDeviceNames,
        setSelectedDeviceNames,
        setTaskbox_expanded,
        setTasks,
        showAlert,
        tasks,
        setAllDevices,
        setIsLoading,
        setSelectedDevice
      )();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Delete Device">
      <span>
        <LoadingButton
          data-testid="DeleteDeviceButton"
          onClick={handleClick}
          loading={loading}
          disabled={loading}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <DeleteIcon fontSize="inherit" />
        </LoadingButton>
      </span>
    </Tooltip>
  );
};

export default DeleteDeviceButton;
