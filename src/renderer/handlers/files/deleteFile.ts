import fs from 'fs';
import path from 'path';
// Adjust the path according to your project structure

export async function deleteFile(
  setSelectedFileNames: (selectedFileNames: string[]) => void,
  selectedFileNames: string[],
  global_file_path: string | null,
  updates: number,
  setUpdates: (updates: number) => void
): Promise<string> {
  if (selectedFileNames.length === 0) {
    return 'No file selected';
  }

  const deletePromises: Promise<void>[] = [];  // Array to hold promises for deletion operations

  selectedFileNames.forEach((fileName: string) => {
    const currentPath: string = global_file_path ?? '';
    const filePath: string = path.join(currentPath, fileName);

    // Create a promise for each file operation and push it to the array
    const deletePromise = new Promise<void>((resolve, reject) => {
      fs.stat(filePath, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
        if (err) {
          console.error(`Error reading file stats: ${err}`);
          reject(err);
          return;
        }
        if (stats.isDirectory()) {
          fs.rmdir(filePath, { recursive: true }, (err: NodeJS.ErrnoException | null) => {
            if (err) {
              console.error(`Error deleting directory: ${err}`);
              reject(err);
            } else {
              console.log(`Directory '${fileName}' deleted successfully at ${filePath}`);
              resolve();
            }
          });
        } else if (stats.isFile()) {
          fs.unlink(filePath, (err: NodeJS.ErrnoException | null) => {
            if (err) {
              console.error(`Error deleting file: ${err}`);
              reject(err);
            } else {
              console.log(`File '${fileName}' deleted successfully at ${filePath}`);
              resolve();
            }
          });
        }
      });
    });

    deletePromises.push(deletePromise);
  });

  try {
    await Promise.all(deletePromises);
    setSelectedFileNames([]);
    setUpdates(updates + 1);
    return 'success';
  } catch (error) {
    console.error('Error during deletion:', error);
    return 'file_not_found';
  }
}
