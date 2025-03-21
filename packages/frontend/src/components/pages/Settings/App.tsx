import React, { useState, useEffect } from 'react';
import { Button, Card, Grid, Stack, Typography, Box } from '@mui/material';
import { ipcRenderer } from 'electron';
import { Alert } from '../../template/alert';

export default function App() {
    const [updateStatus, setUpdateStatus] = useState<{ title: string; messages: string[] } | null>(null);
    const [showAlert, setShowAlert] = useState(false);
    const [appVersion, setAppVersion] = useState('');

    useEffect(() => {
        // Listen for update status messages
        ipcRenderer.on('update-message', (_, message) => {
            console.log('Received update message:', message);
            setUpdateStatus({
                title: 'Update Status',
                messages: [message]
            });
            console.log('message', message);
            setShowAlert(true);
        });

        ipcRenderer.on('update-available', () => {
            console.log('Received update-available event');
            setUpdateStatus({
                title: 'Update Available',
                messages: ['A new version of Banbury Cloud is available.']
            });
            setShowAlert(true);
        });

        ipcRenderer.on('update-not-available', () => {
            console.log('Received update-not-available event');
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
        console.log('Checking for updates...');
        ipcRenderer.send('check-for-updates');
    };

    return (
        <>
            {updateStatus && (
                <Alert
                    title={updateStatus.title}
                    messages={updateStatus.messages}
                    variant={updateStatus.title === 'Up to Date' ? 'success' : 'info'}
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
        </>
    );
}
