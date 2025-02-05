import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function uploadFile(file_path: any) {

  const directory_name: string = "BCloud";
  const directory_path: string = path.join(os.homedir(), directory_name);

  try {
    fs.copyFileSync(file_path, path.join(directory_path, path.basename(file_path)));
  } catch (error) {
    console.log(`Error copying file: ${error}`);
  }

  return '';
}


