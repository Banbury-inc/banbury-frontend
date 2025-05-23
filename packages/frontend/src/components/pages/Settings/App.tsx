import React, { useState, useEffect } from 'react';
import { Card, Grid, Stack, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { ipcRenderer } from 'electron';
import { Alert } from '../../template/alert';
import { useAuth } from '../../../renderer/context/AuthContext';
import { banbury } from '@banbury/core';
import { useTheme, ThemeName } from '../../../renderer/context/ThemeContext';
import { Text } from '../../common/Text/Text';
import { Button } from '../../common/Button/Button';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '../../common/Dropdown/Dropdown';

export default function App() {
    const [updateStatus, setUpdateStatus] = useState<{ title: string; messages: string[] } | null>(null);
    const [showAlert, setShowAlert] = useState(false);
    const [appVersion, setAppVersion] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const { username, logout } = useAuth();
    const { themeName, setTheme } = useTheme();

    useEffect(() => {
        // Listen for update status messages
        ipcRenderer.on('update-message', (_, message) => {
            setUpdateStatus({
                title: 'Update Status',
                messages: [message]
            });
            setShowAlert(true);
        });

        ipcRenderer.on('update-available', () => {
            setUpdateStatus({
                title: 'Update Available',
                messages: ['A new version of Banbury Cloud is available.']
            });
            setShowAlert(true);
        });

        ipcRenderer.on('update-not-available', () => {
            setUpdateStatus({
                title: 'Up to Date',
                messages: ['You are running the latest version.']
            });
            setShowAlert(true);
        });

        // Get app version from main process
        setAppVersion(ipcRenderer.sendSync('get-app-version'));

        // Clean up listeners
        return () => {
            ipcRenderer.removeAllListeners('update-message');
            ipcRenderer.removeAllListeners('update-available');
            ipcRenderer.removeAllListeners('update-not-available');
        };
    }, []);

    // Auto-hide alert after 3 seconds
    useEffect(() => {
        if (showAlert) {
            const timer = setTimeout(() => {
                setShowAlert(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showAlert]);

    const handleCheckUpdate = () => {
        ipcRenderer.send('check-for-updates');
    };

    const handleOpenDeleteDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDialog(false);
    };

    const handleThemeChange = (event: SelectChangeEvent) => {
        setTheme(event.target.value as ThemeName);
        
        setUpdateStatus({
            title: 'Theme Updated',
            messages: ['Your theme has been updated.']
        });
        setShowAlert(true);
    };

    const handleDeleteAccount = async () => {
        if (!username) return;
        
        setDeleteInProgress(true);
        try {
            const result = await banbury.settings.deleteAccount();
            
            if (result === 'success') {
                setUpdateStatus({
                    title: 'Account Deleted',
                    messages: ['Your account has been successfully deleted.']
                });
                setShowAlert(true);
                
                // Close the dialog
                setOpenDialog(false);
                
                // Wait a moment before logging out and redirecting
                setTimeout(() => {
                    logout();
                }, 1000);
            } else {
                setUpdateStatus({
                    title: 'Error',
                    messages: ['Failed to delete account. Please try again later.']
                });
                setShowAlert(true);
                setOpenDialog(false);
            }
        } catch (error: any) {
            setUpdateStatus({
                title: 'Error',
                messages: ['An error occurred while deleting your account: ' + error.message]
            });
            setShowAlert(true);
            setOpenDialog(false);
        } finally {
            setDeleteInProgress(false);
        }
    };

    return (
        <>
            {updateStatus && (
                <Alert
                    title={updateStatus.title}
                    messages={updateStatus.messages}
                    variant={updateStatus.title === 'Up to Date' ? 'success' : updateStatus.title === 'Error' ? 'error' : 'info'}
                    isVisible={showAlert}
                />
            )}

            <Text id="app" className="text-2xl font-bold mb-2">App</Text>

            <Stack direction="column" spacing={3}>
                <Card variant='outlined' sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ pr: 3 }}>
                                        <Text className="text-lg font-semibold mb-1">Current Version</Text>
                                        <Text className="text-xs text-gray-500">{appVersion}</Text>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                    </Grid>
                </Card>

                {/* Theme Selector Card */}
                <Card variant='outlined' sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ pr: 3 }}>
                                        <Text className="text-lg font-semibold mb-1">App Theme</Text>
                                        <Text className="text-xs text-gray-500">Change the appearance of the application</Text>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Dropdown>
                                <DropdownButton outline>
                                    {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                                </DropdownButton>
                                <DropdownMenu>
                                    <DropdownItem onClick={() => handleThemeChange({ target: { value: 'default' } } as any)}>Default</DropdownItem>
                                    <DropdownItem onClick={() => handleThemeChange({ target: { value: 'spotify' } } as any)}>Spotify</DropdownItem>
                                    <DropdownItem onClick={() => handleThemeChange({ target: { value: 'materialui' } } as any)}>Material UI</DropdownItem>
                                    <DropdownItem onClick={() => handleThemeChange({ target: { value: 'theme2' } } as any)}>Orange</DropdownItem>
                                    <DropdownItem onClick={() => handleThemeChange({ target: { value: 'theme3' } } as any)}>Alternate</DropdownItem>
                                    <DropdownItem onClick={() => handleThemeChange({ target: { value: 'theme4' } } as any)}>Dark Monochrome</DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        </Grid>
                    </Grid>
                </Card>

                <Card variant='outlined' sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ pr: 3 }}>
                                        <Text className="text-lg font-semibold mb-1">Check for Updates</Text>
                                        <Text className="text-xs text-gray-500">Check for updates to Banbury Cloud</Text>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                onClick={handleCheckUpdate}
                            >
                                Check
                            </Button>
                        </Grid>
                    </Grid>
                </Card>

                <Card variant='outlined' sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ pr: 3 }}>
                                        <Text className="text-lg font-semibold mb-1">Delete Account</Text>
                                        <Text className="text-xs text-gray-500">Permanently delete your account and all associated data</Text>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                data-testid="delete-account-button"
                                onClick={handleOpenDeleteDialog}
                            >
                                Delete
                            </Button>
                        </Grid>
                    </Grid>
                </Card>

                <Card variant='outlined' sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ pr: 3 }}>
                                        <Text className="text-lg font-semibold mb-1">Help</Text>
                                        <Text className="text-xs text-gray-500">Learn how to use Banbury Cloud</Text>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                            >
                                Open
                            </Button>
                        </Grid>
                    </Grid>
                </Card>
            </Stack>

            {/* Confirmation Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {"Delete your account?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        This action cannot be undone. All of your data, including files, settings, and preferences will be permanently deleted.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} autoFocus>Cancel</Button>
                    <Button 
                        onClick={handleDeleteAccount} 
                        disabled={deleteInProgress}
                    >
                        {deleteInProgress ? 'Deleting...' : 'Delete Account'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
