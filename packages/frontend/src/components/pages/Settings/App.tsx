import React, { useState, useEffect } from 'react';
import { Button, Card, Grid, Stack, Typography, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { ipcRenderer } from 'electron';
import { Alert } from '../../template/alert';
import { useAuth } from '../../../renderer/context/AuthContext';
import { banbury } from '@banbury/core';

export default function App() {
    const [updateStatus, setUpdateStatus] = useState<{ title: string; messages: string[] } | null>(null);
    const [showAlert, setShowAlert] = useState(false);
    const [appVersion, setAppVersion] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const { username, logout } = useAuth();

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

    const handleDeleteAccount = async () => {
        if (!username) return;
        
        setDeleteInProgress(true);
        try {
            const result = await banbury.settings.deleteAccount(username);
            
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

            <Typography id="app" paddingBottom={2} variant="h4" gutterBottom>
                App
            </Typography>

            <Stack direction="column" spacing={3}>
                <Card variant='outlined' sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ pr: 3 }}>
                                        <Typography variant="h6" gutterBottom>Current Version</Typography>
                                        <Typography color="textSecondary" variant="caption">{appVersion}</Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                    </Grid>
                </Card>

                <Card variant='outlined' sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ pr: 3 }}>
                                        <Typography variant="h6" gutterBottom>Check for Updates</Typography>
                                        <Typography color="textSecondary" variant="caption">Check for updates to Banbury Cloud</Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleCheckUpdate}
                                sx={{ mt: 2, fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}
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
                                        <Typography variant="h6" gutterBottom>Delete Account</Typography>
                                        <Typography color="textSecondary" variant="caption">Permanently delete your account and all associated data</Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                data-testid="delete-account-button"
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={handleOpenDeleteDialog}
                                sx={{ mt: 2, fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}
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
                                        <Typography variant="h6" gutterBottom>Help</Typography>
                                        <Typography color="textSecondary" variant="caption">Learn how to use Banbury Cloud</Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                size="small"
                                sx={{ mt: 2, fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}
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
                        color="error" 
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
