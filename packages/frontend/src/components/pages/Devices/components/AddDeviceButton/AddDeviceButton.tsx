import React, { useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import Tooltip from '@mui/material/Tooltip';
import AddToQueueIcon from '@mui/icons-material/AddToQueue';
import type { AlertVariant } from '../../../../../renderer/context/AlertContext';

interface AddDeviceButtonProps {
  selectedDevice: any;
  setTaskbox_expanded: (value: boolean) => void;
  setTasks: (tasks: any) => void;
  showAlert: (title: string, messages: string[], variant?: AlertVariant) => void;
  tasks: any;
  setIsLoading: (value: boolean) => void;
  setAllDevices: (devices: any[]) => void;
  setSelectedDevice: (device: any) => void;
  username: string | null;
  handleAddDeviceClick: (
    selectedDevice: any,
    setTaskbox_expanded: (value: boolean) => void,
    setTasks: (tasks: any) => void,
    showAlert: (title: string, messages: string[], variant?: AlertVariant) => void,
    tasks: any,
    setIsLoading: (value: boolean) => void,
    setAllDevices: (devices: any[]) => void,
    setSelectedDevice: (device: any) => void,
    username: string | null
  ) => () => void;
}

const AddDeviceButton: React.FC<AddDeviceButtonProps> = ({
  selectedDevice,
  setTaskbox_expanded,
  setTasks,
  showAlert,
  tasks,
  setIsLoading,
  setAllDevices,
  setSelectedDevice,
  username,
  handleAddDeviceClick,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await handleAddDeviceClick(
        selectedDevice,
        setTaskbox_expanded,
        setTasks,
        showAlert,
        tasks,
        setIsLoading,
        setAllDevices,
        setSelectedDevice,
        username
      )();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Add Device">
      <span>
        <LoadingButton
          data-testid="AddDeviceButton"
          onClick={handleClick}
          loading={loading}
          disabled={loading}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <AddToQueueIcon fontSize="inherit" />
        </LoadingButton>
      </span>
    </Tooltip>
  );
};

export default AddDeviceButton;
