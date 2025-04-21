import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export async function file_request(senderSocket: net.Socket, file_name: string, file_size: string): Promise<void> {
  const directory_name = "BCloud";
  const directory_path: string = path.join(os.homedir(), directory_name);
  const file_save_path: string = path.join(directory_path, file_name);
  const request_file_name = path.basename(file_save_path);

  // Attempt to open the file
  const file: fs.ReadStream = fs.createReadStream(file_save_path);
  const null_string = "";
  const file_header = `FILE_REQUEST_RESPONSE:${request_file_name}:${file_size}:${null_string}:END_OF_HEADER`;
  senderSocket.write(file_header);

  file.on('data', (bytes_read: Buffer) => {
    senderSocket.write(bytes_read);
  });

  file.on('end', () => {
    senderSocket.end();
  });

  file.on('error', (err: NodeJS.ErrnoException) => {
    senderSocket.end();
    return err;
  });

}
