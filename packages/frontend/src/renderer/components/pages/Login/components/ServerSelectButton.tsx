import React, { useState } from 'react';
import { Button, Popover, Box, Typography, Stack, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { banbury } from '@banbury/core';

const ServerButton = styled(Button)(() => ({
  width: '100%',
  justifyContent: 'flex-start',
  padding: '12px 16px',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
}));

export default function ServerSelectButton() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [isLocal, setIsLocal] = useState(!banbury.config.dev && !banbury.config.semi_local);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLocalSelect = () => {
    banbury.config.dev = false;
    banbury.config.semi_local = false;
    banbury.config.prod = false;
    setIsLocal(true);
    handleClose();
  };

  const handleProductionSelect = () => {
    banbury.config.dev = true;
    banbury.config.semi_local = false;
    banbury.config.prod = false;
    setIsLocal(false);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Server Settings">
        <Button
          onClick={handleClick}
          sx={{ 
            paddingLeft: '4px', 
            paddingRight: '4px', 
            minWidth: '30px',
            '& svg': {
              width: '20px',
              height: '20px',
              fill: 'currentColor'
            }
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.07095 0.650238C6.67391 0.650238 6.32977 0.925096 6.24198 1.31231L6.0039 2.36247C5.6249 2.47269 5.26335 2.62363 4.92436 2.81013L4.01335 2.23585C3.67748 2.00847 3.22826 2.00847 2.89239 2.23585L2.23673 2.89151C2.00935 3.22738 2.00935 3.6766 2.23673 4.01247L2.81101 4.92348C2.62451 5.26247 2.47357 5.62402 2.36335 6.00302L1.31319 6.2411C0.925971 6.32889 0.651113 6.67303 0.651113 7.07007V7.92993C0.651113 8.32697 0.925971 8.67111 1.31319 8.7589L2.36335 8.99698C2.47357 9.37598 2.62451 9.73753 2.81101 10.0765L2.23673 10.9875C2.00935 11.3234 2.00935 11.7726 2.23673 12.1085L2.89239 12.7642C3.22826 12.9915 3.67748 12.9915 4.01335 12.7642L4.92436 12.1899C5.26335 12.3764 5.6249 12.5273 6.0039 12.6375L6.24198 13.6877C6.32977 14.0749 6.67391 14.3498 7.07095 14.3498H7.93081C8.32785 14.3498 8.67199 14.0749 8.75978 13.6877L8.99786 12.6375C9.37686 12.5273 9.73841 12.3764 10.0774 12.1899L10.9884 12.7642C11.3243 12.9915 11.7735 12.9915 12.1094 12.7642L12.765 12.1085C12.9924 11.7726 12.9924 11.3234 12.765 10.9875L12.1907 10.0765C12.3772 9.73753 12.5282 9.37598 12.6384 8.99698L13.6886 8.7589C14.0758 8.67111 14.3506 8.32697 14.3506 7.92993V7.07007C14.3506 6.67303 14.0758 6.32889 13.6886 6.2411L12.6384 6.00302C12.5282 5.62402 12.3772 5.26247 12.1907 4.92348L12.765 4.01247C12.9924 3.6766 12.9924 3.22738 12.765 2.89151L12.1094 2.23585C11.7735 2.00847 11.3243 2.00847 10.9884 2.23585L10.0774 2.81013C9.73841 2.62363 9.37686 2.47269 8.99786 2.36247L8.75978 1.31231C8.67199 0.925096 8.32785 0.650238 7.93081 0.650238H7.07095ZM7.50088 5.10029C8.81532 5.10029 9.90088 6.18585 9.90088 7.50029C9.90088 8.81473 8.81532 9.90029 7.50088 9.90029C6.18644 9.90029 5.10088 8.81473 5.10088 7.50029C5.10088 6.18585 6.18644 5.10029 7.50088 5.10029Z"
              fill="currentColor"
            />
          </svg>
        </Button>
      </Tooltip>
      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            width: '200px',
            backgroundColor: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            mt: 1,
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1}>
            <ServerButton 
              onClick={handleLocalSelect}
              sx={{ 
                backgroundColor: isLocal ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                '&:hover': {
                  backgroundColor: isLocal ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                }
              }}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', marginRight: '8px' }}>
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white"/>
              </svg>
              <Typography fontSize="inherit" sx={{ color: 'white' }}>Local</Typography>
            </ServerButton>

            <ServerButton 
              onClick={handleProductionSelect}
              sx={{ 
                backgroundColor: !isLocal ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                '&:hover': {
                  backgroundColor: !isLocal ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                }
              }}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', marginRight: '8px' }}>
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="white"/>
              </svg>
              <Typography fontSize="inherit" sx={{ color: 'white' }}>Production</Typography>
            </ServerButton>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
