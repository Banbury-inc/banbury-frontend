import React, { useState } from 'react';
import { Card, Grid, Stack, Box, Divider } from '@mui/material';
import { banbury } from '@banbury/core';
import { useAuth } from '../../../renderer/context/AuthContext';
import { useAlert } from '../../../renderer/context/AlertContext';
import { Text } from '../../common/Text/Text';
import { Button } from '../../common/Button/Button';
import { Textbox } from '../../common/Textbox/Textbox';

export default function CloudSync() {

    const {tasks, setTasks, setTaskbox_expanded } = useAuth();
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
            const taskInfo = await banbury.sessions.addTask(task_description, tasks, setTasks);
            setTaskbox_expanded(true);

            const response = await banbury.settings.updatePerformanceScoreWeightings(
                predicted_cpu_usage_weighting,
                predicted_ram_usage_weighting,
                predicted_gpu_usage_weighting,
                predicted_download_speed_weighting,
                predicted_upload_speed_weighting
            );

            if (response === 'success') {
                await banbury.sessions.completeTask(taskInfo, tasks, setTasks);
                showAlert('Success', ['Performance score weightings updated successfully'], 'success');
            } else {
                await banbury.sessions.failTask(taskInfo, 'Failed to update performance score weightings', tasks, setTasks);
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
            <Text id="cloud-sync" className="text-2xl font-bold mb-2">Cloud Sync</Text>


            <Card variant='outlined' sx={{ p: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack spacing={2} sx={{ width: '100%' }}>
                                    <Box sx={{ pr: 3, pb: 2 }}>
                                        <Text className="text-lg font-semibold mb-1">Performance score weightings</Text>
                                        <Text className="text-xs text-gray-500">When predicting the performance score of each device,
                                            it is important to consider how important each metric is to the overall score. This metric will allow you to adjust
                                            the weightings of each metric.
                                        </Text>
                                    </Box>
                                    <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1' }}>
                                            <Text className="text-lg font-semibold mb-1">Predicted CPU Usage</Text>
                                            <Text className="text-xs text-gray-500">The weight of the predicted CPU usage metric</Text>
                                        </Box>
                                        <Box sx={{ width: '120px' }}>
                                            <Textbox
                                                value={predicted_cpu_usage_weighting}
                                                onChange={e => handleWeightingChange(e.target.value, setPredictedCpuUsageWeighting)}
                                            />
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>
                            <Divider />
                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Text className="text-lg font-semibold mb-1">Predicted RAM Usage</Text>
                                    <Text className="text-xs text-gray-500">The weight of the predicted RAM usage metric</Text>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <Textbox
                                        value={predicted_ram_usage_weighting}
                                        onChange={e => handleWeightingChange(e.target.value, setPredictedRamUsageWeighting)}
                                    />
                                </Box>
                            </Stack>
                            <Divider />

                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Text className="text-lg font-semibold mb-1">Predicted GPU Usage</Text>
                                    <Text className="text-xs text-gray-500">The weight of the predicted GPU usage metric</Text>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <Textbox
                                        value={predicted_gpu_usage_weighting}
                                        onChange={e => handleWeightingChange(e.target.value, setPredictedGpuUsageWeighting)}
                                    />
                                </Box>
                            </Stack>

                            <Divider />
                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Text className="text-lg font-semibold mb-1">Predicted Download Speed</Text>
                                    <Text className="text-xs text-gray-500">The weight of the predicted download speed metric</Text>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <Textbox
                                        value={predicted_download_speed_weighting}
                                        onChange={e => handleWeightingChange(e.target.value, setPredictedDownloadSpeedWeighting)}
                                    />
                                </Box>
                            </Stack>

                            <Divider />
                            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: '1' }}>
                                    <Text className="text-lg font-semibold mb-1">Predicted Upload Speed</Text>
                                    <Text className="text-xs text-gray-500">The weight of the predicted upload speed metric</Text>
                                </Box>
                                <Box sx={{ width: '120px' }}>
                                    <Textbox
                                        value={predicted_upload_speed_weighting}
                                        onChange={e => handleWeightingChange(e.target.value, setPredictedUploadSpeedWeighting)}
                                    />
                                </Box>
                            </Stack>


                        </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            onClick={() => {
                                handleSave(
                                    predicted_cpu_usage_weighting,
                                    predicted_ram_usage_weighting,
                                    predicted_gpu_usage_weighting,
                                    predicted_upload_speed_weighting,
                                    predicted_download_speed_weighting
                                )
                            }}
                        >
                            Save
                        </Button>
                    </Grid>
                </Grid>
            </Card>
        </>
    );
}
