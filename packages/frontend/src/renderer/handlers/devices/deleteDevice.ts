import banbury from '@banbury/core';
import * as CredentialUtils from '../../../../../core/src/utils/credentialUtils'

export function deleteDevice(device_name: string[]): string {
  const senderSocket = banbury.networking.connect();
  const endOfHeader = Buffer.from('END_OF_HEADER');
  const credentials = CredentialUtils.loadCredentials();
  const username = Object.keys(credentials)[0];
  let header: string | null = null;
  let buffer = Buffer.alloc(0);
  const null_arg = ""
  const fileHeader = `DEVICE_DELETE_REQUEST:${device_name}:${null_arg}:${username}:`;
  senderSocket.write(fileHeader);
  senderSocket.write(endOfHeader);

  const jobCompleted = false;
  senderSocket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);
    if (buffer.includes(endOfHeader) && !header) {
      const endOfHeaderIndex = buffer.indexOf(endOfHeader);
      if (endOfHeaderIndex !== -1) {
        const headerPart = buffer.slice(0, endOfHeaderIndex);
        const content = buffer.slice(endOfHeaderIndex + endOfHeader.length);
        header = headerPart.toString();
        buffer = content;
      }
    }
  });

  senderSocket.on('end', () => {
    if (!jobCompleted) {
      console.log('Connection closed before login completion.');
    }
  });

  senderSocket.on('error', (err) => {
    console.error('Error during login:', err);
    senderSocket.end();
  });

  return '';
}

