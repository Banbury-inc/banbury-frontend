import { Command } from 'commander';
import { getScannedFolders, getDeviceId } from './index';

export function addDeviceCommands(program: Command): void {
  const deviceCommand = program
    .command('device')
    .description('Device-related commands');

  deviceCommand
    .command('get-scanned-folders')
    .description('Get scanned folders for a user')
    .argument('[username]', 'username to get scanned folders for', 'User')
    .action(async (username: string) => {
      const response = await getScannedFolders(username);
      // eslint-disable-next-line no-console
      console.log(response);
      process.exit(0);
    });
    
  deviceCommand
    .command('get-device-id')
    .description('Get device ID for a user')
    .argument('[username]', 'username to get device ID for', 'User')
    .action(async (username: string) => {
      const response = await getDeviceId(username);
      // eslint-disable-next-line no-console
      console.log(response);
      process.exit(0);
    });
}