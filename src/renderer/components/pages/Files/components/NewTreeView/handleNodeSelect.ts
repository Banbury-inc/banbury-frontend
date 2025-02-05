import { DatabaseData } from "./types";

export const handleNodeSelect = (
  setFilePath: (filePath: string) => void,
  fileRows: DatabaseData[],
  setFilePathDevice: (deviceName: string) => void,
  nodeId: string,
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
    // Don't set path for root core node
    if (selectedNode.id === 'Core') {
      setFilePath(selectedNode.id);
      setFilePathDevice('');
      return;
    }
    // Don't set path for main Devices or Cloud Sync nodes
    if (selectedNode.id === 'Devices' || selectedNode.id === 'Cloud Sync') {
      setFilePath(`Core/${selectedNode.id}`);
      setFilePathDevice('');
      return;
    }

    let newFilePath = '';
    // If it's a device node (direct child of 'Devices')
    if (selectedNode.file_parent === 'Devices') {
      newFilePath = `Core/Devices/${selectedNode.file_name}`;
    }
    // For files and folders under devices
    else if (selectedNode.file_path) {
      newFilePath = `Core/Devices/${selectedNode.device_name}${selectedNode.file_path}`;
    }
    // Set the global file path and device
    setFilePath(newFilePath);
    setFilePathDevice(selectedNode.device_name);
    // Log the node information

  }
};
