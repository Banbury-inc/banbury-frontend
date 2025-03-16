import React, { useState } from 'react';
import { Button, Popover, Box, Typography, Stack, Autocomplete, TextField, Chip, Paper, CircularProgress, Switch, Tooltip } from '@mui/material';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import LinkIcon from '@mui/icons-material/Link';
import { styled } from '@mui/material/styles';
import { handlers } from '../../../handlers';
import { banbury } from '@banbury/core';
import { useAuth } from '../../../context/AuthContext';
import CheckIcon from '@mui/icons-material/Check';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockIcon from '@mui/icons-material/Lock';
import { useAlert } from '../../../context/AlertContext';

interface ShareFileButtonProps {
  selectedFileNames: string[];
  selectedFileInfo: any[];
  onShare: () => void;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

const ShareButton = styled(Button)(() => ({
  width: '100%',
  justifyContent: 'flex-start',
  padding: '12px 16px',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
}));

export default function ShareFileButton({ selectedFileNames, selectedFileInfo }: ShareFileButtonProps) {

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const { username } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const { showAlert } = useAlert();
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setIsPublic(selectedFileInfo[0]?.is_public ?? false);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setShowSearch(false);
    setShowPermissions(false);
    setSelectedUsers([]);
    setSearchResults([]);
    setIsSharing(false);
    setShareSuccess(false);
    setCopyLinkSuccess(false);
  };

  const handleAddPeople = () => {
    setShowSearch(true);
  };

  const handlePermissions = () => {
    setShowPermissions(true);
  };

  const handleCopyLink = async () => {
    if (selectedFileNames.length === 0) {
      showAlert('No file selected', ['Please select one or more files to copy link'], 'warning');
      return;
    }

    if (!selectedFileInfo || selectedFileInfo.length === 0) {
      showAlert('Error', ['File information not found'], 'error');
      return;
    }

    const file_id = selectedFileInfo[0]?._id;
    if (!file_id) {
      showAlert('Error', ['File ID not found'], 'error');
      return;
    }

    try {
      const link = `http://www.banbury.io/filedownload/${username}/${file_id}`;
      await navigator.clipboard.writeText(link);
      setCopyLinkSuccess(true);

      // Close after showing success for 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      showAlert('Error', ['Failed to copy link to clipboard'], 'error');
    }
  };

  // Update search handler to handle the API response correctly
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await handlers.users.typeahead(query);

      if (!response) {
        throw new Error('No response received from server');
      }

      if (!response.data?.users) {
        throw new Error('Invalid response format');
      }

      setSearchResults(response.data.users);

    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);

      // Determine error message based on error type
      let errorMessage = 'Failed to search for users';
      if (error instanceof TypeError) {
        errorMessage = 'Network error while searching for users';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      showAlert('Search Error', [errorMessage], 'warning');
    }
  };


  const handleShare = async () => {
    setIsSharing(true);

    try {
      // Wait for all share operations to complete
      await Promise.all(
        selectedUsers.flatMap(user =>
          selectedFileNames.map(file =>
            banbury.files.shareFile(file, username, user.username)
          )
        )
      );

      setIsSharing(false);
      setShareSuccess(true);

      // Close after showing success for 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error sharing files:', error);
      showAlert('Share Failed', ['Failed to share files with selected users.']);
      setIsSharing(false);
    }
  };


  const handleMakePublic = async () => {
    if (!selectedFileInfo || selectedFileInfo.length === 0) {
      showAlert('Permission Change Failed', ['No file selected']);
      return;
    }

    const device_name = selectedFileInfo[0]?.device_name;
    if (!device_name) {
      showAlert('Permission Change Failed', ['Device information not found']);
      return;
    }

    try {
      await Promise.all(
        selectedFileNames.map(file =>
          banbury.files.makeFilePublic(username, file, device_name)
        )
      );

      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error making file public:', error);
      showAlert('Permission Change Failed', ['Failed to make file public.']);
    }
  };


  const handleMakePrivate = async () => {
    if (!selectedFileInfo || selectedFileInfo.length === 0) {
      showAlert('Permission Change Failed', ['No file selected'], 'warning');
      return;
    }

    const device_name = selectedFileInfo[0]?.device_name;
    if (!device_name) {
      showAlert('Permission Change Failed', ['Device information not found'], 'error');
      return;
    }

    try {
      await Promise.all(
        selectedFileNames.map(file =>
          banbury.files.makeFilePrivate(username, file, device_name)
        )
      );

      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error making file private:', error);
      showAlert('Permission Change Failed', ['Failed to make file private.']);
      setIsSharing(false);
    }
  };


  return (
    <>
      <Tooltip title="Share">
        <Button
          data-testid="share-file-button"
          onClick={handleClick}
          sx={{ paddingLeft: '4px', paddingRight: '4px', minWidth: '30px' }}
        >
          <ShareOutlinedIcon fontSize="inherit" />
        </Button>
      </Tooltip>
      <Popover
        data-testid="share-file-popover"
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
            width: '300px',
            backgroundColor: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            mt: 1,
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
            '& .MuiTypography-root': {
              color: '#ffffff',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack spacing={1}>
            {!showSearch && !showPermissions ? (
              <>
                <ShareButton onClick={handleAddPeople}>
                  <PersonAddOutlinedIcon fontSize="inherit" sx={{ mr: 1 }} />
                  <Typography fontSize="body1">Add people</Typography>
                </ShareButton>

                <ShareButton onClick={handlePermissions}>
                  <LockOutlinedIcon fontSize="inherit" sx={{ mr: 1 }} />
                  <Typography fontSize="body1">Permissions</Typography>
                </ShareButton>

                <ShareButton onClick={handleCopyLink}>
                  <LinkIcon fontSize="inherit" sx={{ mr: 1 }} />
                  <Typography fontSize="body1">{copyLinkSuccess ? <CheckIcon sx={{ color: 'success.main' }} /> : 'Copy link'}</Typography>
                </ShareButton>
              </>
            ) : (
              <>
                {showSearch && (
                  <Autocomplete
                    multiple
                    autoHighlight
                    options={searchResults}
                    value={selectedUsers}
                    onChange={(_event, newValue) => setSelectedUsers(newValue)}
                    getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        autoFocus
                        size="small"
                        placeholder={selectedUsers.length === 0 ? "Add an email or name" : ""}
                        sx={{
                          '& .MuiInputBase-root': {
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                          }
                        }}
                      />
                    )}
                    onInputChange={(event, value) => handleSearch(value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={`${option.first_name} ${option.last_name}`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            color: 'white',
                            height: '24px',
                            '& .MuiChip-label': {
                              fontSize: '0.8rem',
                              padding: '0 8px',
                            },
                            '& .MuiChip-deleteIcon': {
                              fontSize: '16px',
                              margin: '0 4px 0 -4px',
                            }
                          }}
                        />
                      ))
                    }
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1.5,
                        px: 2,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        '&:last-child': {
                          borderBottom: 'none'
                        }
                      }}>
                        {option.avatar_url ? (
                          <Box
                            component="img"
                            src={option.avatar_url}
                            alt=""
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              bgcolor: 'rgba(147, 51, 234, 0.8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '15px',
                              fontWeight: 500,
                            }}
                          >
                            {`${option.first_name[0]}${option.last_name[0]}`}
                          </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{
                            color: 'white',
                            fontSize: '15px',
                            lineHeight: '20px',
                            mb: 0.5
                          }}>
                            {`${option.first_name} ${option.last_name}`}
                          </Typography>
                          <Typography sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '13px',
                            lineHeight: '16px'
                          }}>
                            {option.email || option.username}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    PaperComponent={({ children, ...props }) => (
                      <Paper
                        {...props}
                        sx={{
                          bgcolor: '#1e1e1e',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          '& .MuiAutocomplete-option': {
                            padding: 0,
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.08)',
                            },
                            '&.Mui-focused': {
                              bgcolor: 'rgba(255, 255, 255, 0.12)',
                            }
                          }
                        }}
                      >
                        <Typography sx={{
                          px: 2,
                          py: 1.5,
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '14px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          Suggested people
                        </Typography>
                        {children}
                      </Paper>
                    )}
                  />
                )}
                {showSearch && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        fontSize: '12px',
                      }}
                      disabled={isSharing}
                      onClick={handleShare}
                    >
                      {isSharing ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : shareSuccess ? (
                        <CheckIcon sx={{ color: 'success.main' }} />
                      ) : (
                        'Share'
                      )}
                    </Button>
                  </Box>
                )}
              </>
            )}


            {showPermissions && (
              <Box sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}>
                  <Typography>Make this file public and sharable</Typography>
                  <Switch
                    checked={isPublic}
                    onChange={(e) => {
                      setIsPublic(e.target.checked);
                      if (e.target.checked) {
                        handleMakePublic();
                      } else {
                        handleMakePrivate();
                      }
                    }}
                    size="small"
                    sx={{
                      mt: 1,
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        '&:hover': {
                          backgroundColor: 'rgba(76, 175, 80, 0.08)',
                        },
                      },
                      '& .MuiSwitch-thumb': {
                        backgroundColor: '#fff',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#2fca45',
                      },
                    }} />
                </Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.secondary'
                }}>
                  <LockIcon fontSize="small" />
                  <Typography variant="body2">
                    {isPublic ? "This file is public" : "This file is currently private"}
                  </Typography>
                </Box>
              </Box>
            )}

            {selectedFileNames.length === 1 && (
              <Box sx={{ mt: 1, px: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedFileNames[0]}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
