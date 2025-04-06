import { connect as deviceConnect, TaskInfo } from '@banbury/core/dist/websocket/connect';

export const connect = async (
    username: string,
    device_name: string,
    taskInfo: TaskInfo,
    tasks: any[],
    setTasks: (tasks: any[]) => void,
    setTaskbox_expanded: (expanded: boolean) => void
) => {
    return deviceConnect(username, device_name, taskInfo, tasks, setTasks, setTaskbox_expanded);
}; 
