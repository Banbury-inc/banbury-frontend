import { updateScoreConfigurationPreferences } from '@banbury/core/dist/device';

export const updateScorePreferences = async (
    username: string,
    usePredictedCPUUsage: boolean,
    usePredictedRAMUsage: boolean,
    usePredictedGPUUsage: boolean,
    usePredictedDownloadSpeed: boolean,
    usePredictedUploadSpeed: boolean,
    useFilesNeeded: boolean,
    useFilesAvailableForDownload: boolean,
    useDeviceinFileSync: boolean,
    deviceName: string
) => {
    return updateScoreConfigurationPreferences(
        username,
        usePredictedCPUUsage,
        usePredictedRAMUsage,
        usePredictedGPUUsage,
        usePredictedDownloadSpeed,
        usePredictedUploadSpeed,
        useFilesNeeded,
        useFilesAvailableForDownload,
        useDeviceinFileSync,
        deviceName
    );
}; 