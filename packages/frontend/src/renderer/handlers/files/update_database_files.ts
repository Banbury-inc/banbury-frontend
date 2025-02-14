import banbury from '@banbury/core';
import { handlers } from '../../handlers';
import os from 'os';
import path from 'path';
import fs from 'fs';

export async function update_database_files(username: string) {
  let files_to_add: any[] = [];
  let files_to_remove: any[] = [];

  try {
    // Save the snapshot
    let result = await handlers.files.save_snapshot(username);
    if (result !== 'success') throw new Error('Failed to save snapshot');

    // Get the snapshot
    result = await handlers.files.get_snapshot();
    if (result !== 'success') throw new Error('Failed to get snapshot');

    // Compare the snapshots
    result = await handlers.files.compare_snapshots();
    if (result !== 'success') throw new Error('Failed to compare snapshots');

    const bcloudDirectory = path.join(os.homedir(), 'BCloud');
    const snapshotComparisonPath = path.join(bcloudDirectory, 'comparison_result.json');

    // Read and parse the comparison result JSON file
    const data = fs.readFileSync(snapshotComparisonPath, 'utf8');
    const comparisonResult = JSON.parse(data);

    // Extract files to add and remove
    files_to_add = comparisonResult.add?.files.map((file: any) => ({
      file_type: file.file_type,
      file_name: file.file_name,
      file_path: file.file_path,
      date_uploaded: file.date_uploaded,
      date_modified: file.date_modified,
      file_size: file.file_size,
      file_priority: file.file_priority,
      file_parent: file.file_parent,
      original_device: file.original_device,
      kind: file.kind,
    })) || [];

    files_to_remove = comparisonResult.remove?.files.map((file: any) => ({
      file_name: file.file_name,
      file_path: file.file_path,
    })) || [];


    // Add files to the database if available
    if (files_to_add.length > 0) {
      result = await banbury.files.addFiles(username, files_to_add);
    }

    // Remove files if available
    if (files_to_remove.length > 0) {
      const device_name = os.hostname();
      result = await banbury.files.removeFiles(username, device_name, files_to_remove);
    }
    return 'success';

  } catch (error) {
    return 'error';
  }
}

// Call the function with a username
update_database_files('mmills');

