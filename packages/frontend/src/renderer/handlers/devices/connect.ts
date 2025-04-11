import { connect as deviceConnect, TaskInfo } from '@banbury/core/dist/websocket/connect';

export const connect = async (
    username: string,
    device_name: string,
    taskInfo: TaskInfo,
    setTasks: (tasks: any[]) => void,
) => {
    // Use taskInfo as the third parameter since that's what the TypeScript type expects
    return deviceConnect(username, device_name, taskInfo as any, setTasks);
}; 
