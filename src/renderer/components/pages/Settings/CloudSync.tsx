import React, { useState } from 'react';
import { Button, Card, Grid, Stack, Typography, Box, Divider, TextField } from '@mui/material';
import { neuranet } from '../../../neuranet';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';

export default function CloudSync() {

    const { username, tasks, setTasks, setTaskbox_expanded } = useAuth();
    const [predicted_cpu_usage_weighting, setPredictedCpuUsageWeighting] = useState(10);
    const [predicted_ram_usage_weighting, setPredictedRamUsageWeighting] = useState(10);
    const [predicted_gpu_usage_weighting, setPredictedGpuUsageWeighting] = useState(10);
    const [predicted_download_speed_weighting, setPredictedDownloadSpeedWeighting] = useState(10);
    const [predicted_upload_speed_weighting, setPredictedUploadSpeedWeighting] = useState(10);
    const { showAlert } = useAlert();

    const handleSave = async (
        predicted_cpu_usage_weighting: number,
        predicted_ram_usage_weighting: number,
        predicted_gpu_usage_weighting: number,
        predicted_upload_speed_weighting: number,
        predicted_download_speed_weighting: number) => {

        try {
            const task_description = 'Updating Settings';
            const taskInfo = await neuranet.sessions.addTask(username ?? '', task_description, tasks, setTasks);
            setTaskbox_expanded(true);

            const response = await neuranet.settings.updatePerformanceScoreWeightings(
                username,
                predicted_cpu_usage_weighting,
                predicted_ram_usage_weighting,
                predicted_gpu_usage_weighting,
                predicted_download_speed_weighting,
                predicted_upload_speed_weighting
            );

            if (response === 'success') {
                console.log('settings update success');
                await neuranet.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
                showAlert('Success', ['Performance score weightings updated successfully'], 'success');
            } else {
                await neuranet.sessions.failTask(username ?? '', taskInfo, 'Failed to update performance score weightings', tasks, setTasks);
                showAlert('Error', ['Failed to update performance score weightings'], 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showAlert('Error', ['Failed to save settings', error instanceof Error ? error.message : 'Unknown error'], 'error');
        }
    }

    const handleWeightingChange = (
        value: string, 
        setter: (value: number) => void
    ) => {
        try {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                showAlert('Warning', ['Please enter a valid number'], 'warning');
                return;
            }
            if (numValue < 0) {
                showAlert('Warning', ['Weight cannot be negative'], 'warning');
                return;
            }
            setter(numValue);
        } catch (error) {
            console.error('Error updating weighting:', error);
            showAlert('Error', ['Failed to update weighting', error instanceof Error ? error.message : 'Unknown error'], 'error');
        }
    };

    return (
        <>
            <Typography id="cloud-sync" paddingBottom={2} variant="h4" gutterBottom>
                Cloud Sync
            </Typography>


            <Card variant='outlined' sx={{ p: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack spacing={2} sx={{ width: '100%' }}>
                                    <Box sx={{ pr: 3, pb: 2 }}>
                                        <Typography variant="h6" gutterBottom>Performance score weightings</Typography>
                                        <Typography color="textSecondary" variant="caption">When predicting the performance score of each device,
                                            it is important to consider how important each metric is to the overall score. This metric will allow you to adjust
                                            the weightings of each metric.
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1' }}>
                                            <Typography variant="h6" gutterBottom>Predicted CPU Usage</Typography>
                                            <Typography color="textSecondary" variant="caption">The weight of the predicted CPU usage metric</Typography>
                                        </Box>
                                        <Box sx={{ width: '120px' }}>
                                            <TextField
                                                size="small"
                                                label="Weight"
                                                value={predicted_cpu_usage_weighting}
                                                onChange={(e) => handleWeightingChange(e.target.value, setPredictedCpuUsageWeighting)}
                                                fullWidth
                                            />
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>
                            <Divider />
                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Typography variant="h6" gutterBottom>Predicted RAM Usage</Typography>
                                    <Typography color="textSecondary" variant="caption">The weight of the predicted RAM usage metric</Typography>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <TextField
                                        size="small"
                                        label="Weight"
                                        value={predicted_ram_usage_weighting}
                                        onChange={(e) => handleWeightingChange(e.target.value, setPredictedRamUsageWeighting)}
                                        fullWidth
                                    />
                                </Box>
                            </Stack>
                            <Divider />

                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Typography variant="h6" gutterBottom>Predicted GPU Usage</Typography>
                                    <Typography color="textSecondary" variant="caption">The weight of the predicted GPU usage metric</Typography>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <TextField
                                        size="small"
                                        label="Weight"
                                        value={predicted_gpu_usage_weighting}
                                        onChange={(e) => handleWeightingChange(e.target.value, setPredictedGpuUsageWeighting)}
                                        fullWidth
                                    />
                                </Box>
                            </Stack>

                            <Divider />
                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Typography variant="h6" gutterBottom>Predicted Download Speed</Typography>
                                    <Typography color="textSecondary" variant="caption">The weight of the predicted download speed metric</Typography>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <TextField
                                        size="small"
                                        label="Weight"
                                        value={predicted_download_speed_weighting}
                                        onChange={(e) => handleWeightingChange(e.target.value, setPredictedDownloadSpeedWeighting)}
                                        fullWidth
                                    />
                                </Box>
                            </Stack>

                            <Divider />
                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Typography variant="h6" gutterBottom>Predicted Upload Speed</Typography>
                                    <Typography color="textSecondary" variant="caption">The weight of the predicted upload speed metric</Typography>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <TextField
                                        size="small"
                                        label="Weight"
                                        value={predicted_upload_speed_weighting}
                                        onChange={(e) => handleWeightingChange(e.target.value, setPredictedUploadSpeedWeighting)}
                                        fullWidth
                                    />
                                </Box>
                            </Stack>


                        </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                handleSave(
                                    predicted_cpu_usage_weighting,
                                    predicted_ram_usage_weighting,
                                    predicted_gpu_usage_weighting,
                                    predicted_upload_speed_weighting,
                                    predicted_download_speed_weighting
                                )
                            }}
                            sx={{ mt: 2, fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}
                        >
                            Save
                        </Button>
                    </Grid>
                </Grid>
            </Card>
        </>
    );
}
