import { DatabaseData } from "./types";

export const handleNodeSelect = (
  setFilePath: (filePath: string) => void,
  fileRows: DatabaseData[],
  setFilePathDevice: (deviceName: string) => void,
  nodeId: string,
  currentPath: string,
  setBackHistory: React.Dispatch<React.SetStateAction<string[]>>,
  setForwardHistory: React.Dispatch<React.SetStateAction<string[]>>
) => {

  const findNodeById = (nodes: DatabaseData[], id: any): DatabaseData | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const childNode = findNodeById(node.children, id);
        if (childNode) {
          return childNode;
        }
      }
    }
    return null;
  };
  const selectedNode = findNodeById(fileRows, nodeId);
  if (selectedNode) {
    let newFilePath = '';
    // Don't set path for root core node
    if (selectedNode.id === 'Core') {
      newFilePath = selectedNode.id;
      setFilePathDevice('');
    }
    // Don't set path for main Devices or Cloud Sync nodes
    else if (selectedNode.id === 'Devices' || selectedNode.id === 'Cloud Sync') {
      newFilePath = `Core/${selectedNode.id}`;
      setFilePathDevice('');
    }
    // If it's a device node (direct child of 'Devices')
    else if (selectedNode.file_parent === 'Devices') {
      newFilePath = `Core/Devices/${selectedNode.file_name}`;
    }
    // For files and folders under devices
    else if (selectedNode.file_path) {
      newFilePath = `Core/Devices/${selectedNode.device_name}${selectedNode.file_path}`;
    }

    // Update navigation history
    if (currentPath) {
      setBackHistory(prev => [...prev, currentPath]);
      setForwardHistory([]); // Clear forward history when navigating to a new path
    }

    // Set the global file path and device
    setFilePath(newFilePath);
    setFilePathDevice(selectedNode.device_name);
    // Log the node information

  }
};
