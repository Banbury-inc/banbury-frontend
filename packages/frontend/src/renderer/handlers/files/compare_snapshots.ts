
import fs from 'fs';
import path from 'path';
import os from 'os';

interface File {
  id: number;
  file_type: string;
  file_name: string;
  file_path: string;
  date_uploaded: string;
  date_modified: string;
  file_size: number;
  file_priority: number;
  file_parent: string;
  kind: string;
  deviceID: string;
  original_device: string;
}

interface Actions {
  add: {
    files: {
      file_type: string;
      file_name: string;
      file_path: string;
      date_uploaded: string;
      date_modified: string;
      file_size: number;
      file_priority: number;
      file_parent: string;
      kind: string;
      original_device: string;

    }[];
  };
  remove: {
    files: {
      file_name: string;
      file_path: string;
    }[];
  };
}

// Function to read and parse a JSON file
function readSnapshot(filePath: string): File[] | null {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as File[];
  } catch (error) {
    console.error(`Error reading or parsing the file: ${filePath}`, error);
    return null;
  }
}

// Function to compare files
function compareSnapshots(serverFiles: File[], clientFiles: File[]): Actions {
  const actions: Actions = {
    add: {
      files: []
    },
    remove: {
      files: []
    }
  };

  // Step 1: Compare files that are on the client but not on the server -> Add to server
  clientFiles.forEach((clientFile: File) => {
    const correspondingServerFile = serverFiles.find(
      (serverFile: File) =>
        serverFile.file_name === clientFile.file_name &&
        serverFile.file_path === clientFile.file_path &&
        serverFile.deviceID === clientFile.deviceID

    );

    if (!correspondingServerFile) {
      actions.add.files.push({
        file_type: clientFile.file_type,
        file_name: clientFile.file_name,
        file_path: clientFile.file_path,
        date_uploaded: clientFile.date_uploaded,
        date_modified: clientFile.date_modified,
        file_size: clientFile.file_size,
        file_priority: clientFile.file_priority,
        file_parent: clientFile.file_parent,
        original_device: clientFile.original_device,
        kind: clientFile.kind
      });
    }
  });

  // Step 2: Compare files that are on the server but not on the client -> Remove from server
  serverFiles.forEach((serverFile: File) => {
    const correspondingClientFile = clientFiles.find(
      (clientFile: File) =>
        clientFile.file_name === serverFile.file_name &&
        clientFile.file_path === serverFile.file_path &&
        clientFile.deviceID === serverFile.deviceID

    );

    if (!correspondingClientFile) {
      actions.remove.files.push({
        file_name: serverFile.file_name,
        file_path: serverFile.file_path


      });
    }
  });

  return actions;
}

// Function to load both snapshots and compare them
export async function compare_snapshots() {
  const bcloudDirectory = path.join(os.homedir(), 'BCloud'); // Path to the BCloud directory
  const serverSnapshotPath = path.join(bcloudDirectory, 'mmills_database_snapshot.json'); // Server snapshot file
  const clientSnapshotPath = path.join(bcloudDirectory, 'mmills_snapshot.json'); // Client snapshot file

  const serverFiles = readSnapshot(serverSnapshotPath);
  const clientFiles = readSnapshot(clientSnapshotPath);

  if (!serverFiles || !clientFiles) {
    console.error('Failed to load snapshots.');
    const result = 'error';
    return result;
  }

  // Log snapshots to check their contents
  // console.log('Server Snapshot:', JSON.stringify(serverFiles, null, 2));
  // console.log('Client Snapshot:', JSON.stringify(clientFiles, null, 2));

  const comparisonResult = compareSnapshots(serverFiles, clientFiles);
  // console.log('Comparison Result:', comparisonResult);

  // Save the comparison result to a JSON file
  const comparisonFilePath = path.join(bcloudDirectory, 'comparison_result.json');
  fs.writeFileSync(comparisonFilePath, JSON.stringify(comparisonResult, null, 2));
  //
  // console.log(`Comparison result saved to ${comparisonFilePath}`);
  const result = 'success';
  return result;

}

// Run the comparison
compare_snapshots();
