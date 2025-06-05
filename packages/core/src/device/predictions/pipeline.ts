import * as tf from '@tensorflow/tfjs';
import banbury from '../..';
import axios from 'axios';
import { CONFIG } from '../../config';
import { ScoringService, type DevicePerformanceData } from './scoringService';
import { AllocationService, type Device, type DevicePredictions, type FileSyncInfo } from './allocationService';
import { getSyncFiles } from '../../files/getSyncFiles';

function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

// Prepare data for LSTM (sequence format)
function createSequences(data: number[], sequenceLength: number): { inputs: number[][], outputs: number[] } {
    const inputs: number[][] = [];
    const outputs: number[] = [];
    
    for (let i = 0; i <= data.length - sequenceLength - 1; i++) {
        const sequence = data.slice(i, i + sequenceLength);
        const target = data[i + sequenceLength];
        inputs.push(sequence);
        outputs.push(target);
    }
    
    return { inputs, outputs };
}

export async function pipeline() {
    console.log('running pipeline');
    // get every device id that is owned by the user
    const deviceData = await banbury.device.fetchDeviceData();

    if (!Array.isArray(deviceData)) {
        console.error('Failed to fetch device data:', deviceData);
        return;
    }

    // Get device IDs
    const deviceIds = deviceData.map((device: any) => device._id);
    console.log('deviceIds', deviceIds);

    // Check if predictions were made recently (within the last 10 minutes)
    try {
        // Check if ANY device has recent predictions (less than 10 minutes old)
        let hasRecentPredictions = false;
        
        for (const deviceId of deviceIds) {
            const predictionData = await banbury.device.getTimeseriesPredictionData(deviceId);
            
            if (Array.isArray(predictionData) && predictionData.length > 0) {
                // Find the most recent prediction timestamp
                const timestamps = predictionData.map(p => new Date(p.timestamp).getTime());
                const latestTimestamp = new Date(Math.max(...timestamps));
                const currentTime = new Date();
                const timeDiffMinutes = (currentTime.getTime() - latestTimestamp.getTime()) / (1000 * 60);
                console.log('timeDiffMinutes', timeDiffMinutes);
                // if (timeDiffMinutes < 10) {
                //     hasRecentPredictions = true;
                //     break; // Exit the loop as soon as we find one device with recent predictions
                // }
            }
        }
        
        // Skip pipeline if any device has predictions less than 10 minutes old
        if (hasRecentPredictions) {
            console.log('hasRecentPredictions', hasRecentPredictions);
            return { skipped: true, reason: 'Recent predictions available' };
        }
    } catch (error) {
        // If there's an error checking the last prediction time, continue with the pipeline
        console.warn('⚠️ Error checking last prediction time, continuing with pipeline:', error);
    }

    const timeseriesResults: any[] = [];
    const predictions: any[] = [];
    const FUTURE_STEPS = 100; // Number of future time steps to predict
    const SEQUENCE_LENGTH = 5; // Length of sequences for LSTM

    for (let deviceIndex = 0; deviceIndex < deviceIds.length; deviceIndex++) {
        console.log('deviceIndex', deviceIndex);
        const deviceId = deviceIds[deviceIndex];
        
        // for each device id, get the timeseries data
        const timeseriesData = await banbury.device.getTimeseriesData(deviceId);
        // filter timeseries data to only include the last 100 rows
        const filteredTimeseriesData = timeseriesData.slice(-100);
        timeseriesResults.push({ deviceId, filteredTimeseriesData });

        // Assume timeseriesData is an array of objects with the same keys (metrics)
        if (!Array.isArray(filteredTimeseriesData) || filteredTimeseriesData.length < SEQUENCE_LENGTH + 1) {
            predictions.push({ deviceId, prediction: null, error: 'Not enough data' });
            continue;
        }

        // Get all metric keys (excluding timestamp if present)
        const metricKeys = Object.keys(filteredTimeseriesData[0]).filter(k => k !== 'timestamp' && k !== 'metadata' && k !== '_id');
        
        const devicePrediction: Record<string, { timestamp: string, value: number | null }[] | null> = {};

        // Prepare timestamp extrapolation
        const lastIdx = filteredTimeseriesData.length - 1;
        let lastTimestamp = filteredTimeseriesData[lastIdx].timestamp;
        let prevTimestamp = filteredTimeseriesData[lastIdx - 1].timestamp;
        let lastTsNum = typeof lastTimestamp === 'number' ? lastTimestamp : Date.parse(lastTimestamp);
        let prevTsNum = typeof prevTimestamp === 'number' ? prevTimestamp : Date.parse(prevTimestamp);
        let interval = lastTsNum - prevTsNum;
        if (!interval || interval <= 0) interval = 60000; // fallback to 1 minute if invalid

        for (let metricIndex = 0; metricIndex < metricKeys.length; metricIndex++) {
            console.log('metricIndex', metricIndex);
            const key = metricKeys[metricIndex];
            
            // Extract the series for this metric
            const series = filteredTimeseriesData.map((row: any) => Number(row[key])).filter(v => !isNaN(v));
            if (series.length < SEQUENCE_LENGTH + 1) {
                devicePrediction[key] = null;
                continue;
            }

            // Min-max normalization
            const min = Math.min(...series);
            const max = Math.max(...series);
            let normalizedSeries = series;
            let denormalize = (v: number) => v;
            if (max !== min) {
                normalizedSeries = series.map(v => (v - min) / (max - min));
                denormalize = (v: number) => v * (max - min) + min;
            }

            // Prepare data for LSTM using sequence format
            const { inputs, outputs } = createSequences(normalizedSeries, SEQUENCE_LENGTH);
            
            // Convert to tensors - fix tensor shape typing
            const xs = tf.tensor3d(inputs.map(seq => seq.map(val => [val])), [inputs.length, SEQUENCE_LENGTH, 1]);
            const ys = tf.tensor2d(outputs.map(val => [val]), [outputs.length, 1]);

            // Build LSTM model
            const model = tf.sequential();
            model.add(tf.layers.lstm({
                units: 16,
                inputShape: [SEQUENCE_LENGTH, 1],
                returnSequences: false
            }));
            model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 1 }));
            
            model.compile({ 
                optimizer: tf.train.adam(0.01), 
                loss: 'meanSquaredError'
            });

            const totalEpochs = 25;
            
            // Fit the model
            await model.fit(xs, ys, { 
                epochs: totalEpochs, 
                batchSize: Math.min(32, inputs.length),
                shuffle: true
            });
            
            // Initial sequence is the last SEQUENCE_LENGTH elements from normalized series
            let sequence = normalizedSeries.slice(-SEQUENCE_LENGTH);
            let lastTimestampRaw = filteredTimeseriesData[filteredTimeseriesData.length - 1].timestamp;
            if (typeof lastTimestampRaw === 'string' && !lastTimestampRaw.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(lastTimestampRaw)) {
                lastTimestampRaw += 'Z';
            }
            let futureTs = typeof lastTimestampRaw === 'number'
                ? lastTimestampRaw
                : Date.parse(lastTimestampRaw);
            const futurePreds: { timestamp: string, value: number | null }[] = [];
            
            // Show prediction progress in chunks
            for (let i = 0; i < FUTURE_STEPS; i++) {
                console.log('i', i);
                // Show progress updates periodically
                
                // Reshape the sequence for the LSTM input [batch, timesteps, features]
                const inputTensor = tf.tensor3d([sequence.map(val => [val])], [1, SEQUENCE_LENGTH, 1]);
                const predTensor = model.predict(inputTensor) as tf.Tensor;
                let predValue = (await predTensor.data())[0];
                
                // Denormalize prediction
                predValue = denormalize(predValue);
                
                // Small random factor for more natural variation (±2%)
                const randomFactor = 1 + (Math.random() * 0.04 - 0.02);
                predValue = predValue * randomFactor;
                
                let isValid = !(isNaN(predValue) || !isFinite(predValue));
                
                // Format timestamp as ISO string
                const isoTimestamp = new Date(futureTs).toISOString();
                futurePreds.push({ timestamp: isoTimestamp, value: isValid ? predValue : null });
                
                if (isValid) {
                    // Update sequence by removing the first element and adding the prediction
                    const normalizedPred = max !== min ? (predValue - min) / (max - min) : predValue;
                    sequence = [...sequence.slice(1), normalizedPred];
                }
                
                inputTensor.dispose();
                predTensor.dispose();
                futureTs += interval;
            }
            
            devicePrediction[key] = futurePreds;

            // Dispose tensors
            xs.dispose();
            ys.dispose();
            model.dispose();
        }

        predictions.push({ deviceId, prediction: devicePrediction });
    }

    console.log('done with predictions');

    // Flatten predictions for all devices as snapshots per timestamp
    const flatPredictions: any[] = [];
    for (const { deviceId, prediction } of predictions) {
        if (!prediction) continue;

        // Get the original device metadata (from deviceData)
        const deviceMeta = deviceData.find((d: any) => d._id === deviceId) || {};

        // Find all timestamps (assuming all metrics have the same timestamps)
        const metricArrays = Object.values(prediction).filter(arr => Array.isArray(arr)) as { timestamp: string, value: number | null }[][];
        if (metricArrays.length === 0) continue;
        const timestamps = metricArrays[0].map(item => item.timestamp);
        console.log('timestamps')

        for (let i = 0; i < timestamps.length; i++) {
            const snapshot: any = {
                timestamp: timestamps[i],
                metadata: {
                    device_id: deviceMeta._id,
                    device_name: deviceMeta.device_name,
                    username: deviceMeta.username,
                },
            };
            // Add all predicted metrics for this timestamp
            for (const metric of Object.keys(prediction)) {
                const arr = prediction[metric];
                if (Array.isArray(arr) && arr[i]) {
                    let value = arr[i].value;
                    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
                        value = null;
                    }
                    snapshot[metric] = value;
                }
            }
            // Sanitize timestamp
            let tsNum = Date.parse(snapshot.timestamp);
            if (!Number.isFinite(tsNum) || tsNum > Number.MAX_SAFE_INTEGER) {
                snapshot.timestamp = new Date().toISOString();
            }
            flatPredictions.push(snapshot);
        }
    }

    // SCORING SERVICE - Calculate device scores based on predicted performance
    console.log('🔢 Calculating device scores...');
    const scoringService = new ScoringService();
    
    // Transform prediction data to match ScoringService input format
    const performanceData: DevicePerformanceData[] = [];
    for (const { deviceId, prediction } of predictions) {
        if (!prediction) continue;
        
        const deviceMeta = deviceData.find((d: any) => d._id === deviceId);
        if (!deviceMeta) continue;
        
        // Get latest predicted values for scoring metrics
        const getLatestPredictedValue = (metricName: string): number => {
            const metricArray = prediction[metricName];
            if (!Array.isArray(metricArray) || metricArray.length === 0) return 0;
            const latestEntry = metricArray[metricArray.length - 1];
            return latestEntry?.value ?? 0;
        };
        
        performanceData.push({
            device_name: deviceMeta.device_name || deviceId,
            predicted_upload_speed: getLatestPredictedValue('upload_speed'),
            predicted_download_speed: getLatestPredictedValue('download_speed'),
            predicted_gpu_usage: getLatestPredictedValue('gpu_usage'),
            predicted_cpu_usage: getLatestPredictedValue('cpu_usage'),
            predicted_ram_usage: getLatestPredictedValue('ram_usage'),
        });
    }
    
    let scoredDevices: DevicePerformanceData[] = [];
    try {
        scoredDevices = await scoringService.devices(performanceData);
        console.log(`✅ Calculated scores for ${scoredDevices.length} devices`);
    } catch (error) {
        console.warn('⚠️ Error calculating device scores, continuing without scores:', error);
    }

    // ALLOCATION SERVICE - Allocate files to devices based on scores and capacity
    console.log('📁 Allocating files to devices...');
    const allocationService = new AllocationService();
    let allocatedDevices: Device[] = [];
    
    try {
        // Fetch file sync information
        const syncFilesResponse = await getSyncFiles();
        const fileSyncData = syncFilesResponse.files;
        
        if (Array.isArray(fileSyncData) && fileSyncData.length > 0) {
            // Transform scored devices to DevicePredictions format
            console.log('Available device data:', deviceData.map(d => ({ _id: d._id, device_name: d.device_name })));
            console.log('Scored devices:', scoredDevices.map(s => ({ device_name: s.device_name, score: s.score })));
            
            const devicePredictions: DevicePredictions = {
                device_predictions: scoredDevices.map(scoredDevice => {
                    const deviceMeta = deviceData.find((d: any) => d.device_name === scoredDevice.device_name);
                    console.log(`Matching device ${scoredDevice.device_name}:`, deviceMeta ? { _id: deviceMeta._id, device_name: deviceMeta.device_name } : 'NOT FOUND');
                    
                    // Ensure we have a device_id - if not found by name, try to find by index or use a fallback
                    let device_id = deviceMeta?._id;
                    if (!device_id) {
                        // Fallback: try to match with deviceIds array by index if names don't match
                        const deviceIndex = scoredDevices.findIndex(s => s.device_name === scoredDevice.device_name);
                        if (deviceIndex >= 0 && deviceIndex < deviceIds.length) {
                            device_id = deviceIds[deviceIndex];
                            console.log(`Using fallback device_id for ${scoredDevice.device_name}: ${device_id}`);
                        }
                    }
                    
                    if (!device_id) {
                        console.error(`❌ No device_id found for device: ${scoredDevice.device_name}`);
                    }
                    
                    return {
                        device_name: scoredDevice.device_name,
                        device_id: device_id,
                        score: scoredDevice.score || 0,
                        // setting sync storage capacity to 500 for now
                        sync_storage_capacity_gb: 500,
                        // setting use device_in_file_sync to true temporarily for now
                        use_device_in_file_sync: true,
                    };
                })
            };
            
            const fileSyncInfo: FileSyncInfo[] = [{ files: fileSyncData }];
            allocatedDevices = allocationService.devices(devicePredictions, fileSyncInfo);
            
            // Generate file-device mappings
            console.log('Allocated devices before mapping:', allocatedDevices.map(d => ({
                device_name: d.device_name,
                device_id: d.device_id,
                files_count: d.files?.length || 0,
                files: d.files?.map(f => ({ file_id: f.file_id, file_name: f.file_name }))
            })));
            const fileDeviceMappings = allocationService.generateFileDeviceMappings(allocatedDevices);
            console.log('Generated file device mappings:', fileDeviceMappings);
            
            console.log(`✅ Allocated ${fileSyncData.length} files across ${allocatedDevices.length} devices`);
            
            // Update proposed device IDs for each file individually
            try {
                const updatePromises = fileDeviceMappings.map(async (mapping) => {
                    try {
                        await axios.post(`${CONFIG.url}/predictions/update_file_sync_proposed_device_ids/`, {
                            file_id: mapping.file_id,
                            proposed_device_ids: mapping.proposed_device_ids
                        });
                    } catch (error) {
                        console.error(`❌ Failed to update proposed device IDs for file ${mapping.file_id}:`, error);
                    }
                });
                
                await Promise.all(updatePromises);
                console.log(`✅ Updated proposed device IDs for ${fileDeviceMappings.length} files`);
            } catch (allocationError) {
                console.error('❌ Failed to update file allocation mappings:', allocationError);
            }
        } else {
            console.log('ℹ️ No files to sync, skipping allocation');
        }
    } catch (error) {
        console.warn('⚠️ Error in file allocation, continuing without allocation:', error);
    }

    // Send in batches of 1000, concurrently
    const predictionChunks = chunkArray(flatPredictions, 1000);
    
    try {
        await Promise.all(
            predictionChunks.map(async (chunk, index) => {
                try {
                    await axios.post(`${CONFIG.url}/predictions/store_device_predictions/`, { predictions: chunk });
                } catch (err) {
                    console.error(`  ❌ Failed to store batch ${index + 1}/${predictionChunks.length}:`, err);
                }
            })
        );
    } catch (err) {
        console.error('❌ Failed to store predictions in backend:', err);
    }

    return { 
        timeseriesResults, 
        predictions, 
        scoredDevices: scoredDevices.length > 0 ? scoredDevices : undefined,
        allocatedDevices: allocatedDevices.length > 0 ? allocatedDevices : undefined
    };
}

// ✅ SCORING SERVICE - Implemented above
// ✅ ALLOCATION SERVICE - Implemented above
