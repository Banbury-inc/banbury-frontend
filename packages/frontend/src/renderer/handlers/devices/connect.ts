import { connect as deviceConnect } from '@banbury/core/dist/device/connect';

export const connect = async (
    username: string,
    devices: string[],
    onMessage: () => void,
    onClose: () => void
) => {
    return deviceConnect(username, devices, onMessage, onClose);
}; 