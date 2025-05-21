import * as tf from '@tensorflow/tfjs';
import banbury from '../..';


export async function pipeline() {
    console.log('Starting Pipeline');

    // get every device id that is owned by the user
    const deviceData = await banbury.device.fetchDeviceData();

    console.log('Device Data:', deviceData);

    if (!Array.isArray(deviceData)) {
        console.error('Failed to fetch device data:', deviceData);
        return;
    }

    const deviceIds = deviceData.map((device: any) => device._id);
    const timeseriesResults: any[] = [];
    const predictions: any[] = [];
    const FUTURE_STEPS = 10080; // Number of future time steps to predict

    for (const deviceId of deviceIds) {
        // for each device id, get the timeseries data
        const timeseriesData = await banbury.device.getTimeseriesData(deviceId);
        timeseriesResults.push({ deviceId, timeseriesData });

        // Assume timeseriesData is an array of objects with the same keys (metrics)
        if (!Array.isArray(timeseriesData) || timeseriesData.length < 2) {
            predictions.push({ deviceId, prediction: null, error: 'Not enough data' });
            continue;
        }

        // Get all metric keys (excluding timestamp if present)
        const metricKeys = Object.keys(timeseriesData[0]).filter(k => k !== 'timestamp' && k !== 'metadata' && k !== '_id');
        const devicePrediction: Record<string, { timestamp: string, value: number | null }[] | null> = {};

        // Prepare timestamp extrapolation
        const lastIdx = timeseriesData.length - 1;
        let lastTimestamp = timeseriesData[lastIdx].timestamp;
        let prevTimestamp = timeseriesData[lastIdx - 1].timestamp;
        let lastTsNum = typeof lastTimestamp === 'number' ? lastTimestamp : Date.parse(lastTimestamp);
        let prevTsNum = typeof prevTimestamp === 'number' ? prevTimestamp : Date.parse(prevTimestamp);
        let interval = 60000;

        for (const key of metricKeys) {
            // Extract the series for this metric
            const series = timeseriesData.map((row: any) => Number(row[key])).filter(v => !isNaN(v));
            if (series.length < 2) {
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

            // Prepare data for simple linear regression: predict next value
            const xs = tf.tensor1d(normalizedSeries.slice(0, -1));
            const ys = tf.tensor1d(normalizedSeries.slice(1));

            // Linear regression model: y = a*x + b
            const model = tf.sequential();
            model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
            model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

            // Fit the model
            await model.fit(xs.reshape([-1, 1]), ys.reshape([-1, 1]), { epochs: 50, verbose: 0 });

            // Predict multiple future values recursively, with timestamps
            let lastValue = normalizedSeries[normalizedSeries.length - 1];
            let futureTs = lastTsNum;
            const futurePreds: { timestamp: string, value: number | null }[] = [];
            for (let i = 0; i < FUTURE_STEPS; i++) {
                futureTs += interval;
                const inputTensor = tf.tensor2d([[lastValue]]);
                const predTensor = model.predict(inputTensor) as tf.Tensor;
                let predValue = (await predTensor.data())[0];
                // Denormalize prediction
                predValue = denormalize(predValue);
                let isValid = !(isNaN(predValue) || !isFinite(predValue));
                // Format timestamp as ISO string
                const isoTimestamp = new Date(futureTs).toISOString();
                futurePreds.push({ timestamp: isoTimestamp, value: isValid ? predValue : null });
                if (isValid) {
                    lastValue = max !== min ? (predValue - min) / (max - min) : predValue;
                }
                inputTensor.dispose();
                predTensor.dispose();
            }
            devicePrediction[key] = futurePreds;

            // Dispose tensors
            xs.dispose();
            ys.dispose();
            model.dispose();
        }

        predictions.push({ deviceId, prediction: devicePrediction });
    }

    // Improved logging for readability
    console.log('Timeseries Results:', JSON.stringify(timeseriesResults, null, 2));
    console.log('Predictions:', JSON.stringify(predictions, null, 2));
    return { timeseriesResults, predictions };
}