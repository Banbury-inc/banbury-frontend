import { Command } from 'commander';
import { deleteAccount } from './index';

export function addSettingsCommands(program: Command): void {
  const settingsCommand = program
    .command('settings')
    .description('Settings-related commands');

  settingsCommand
    .command('delete-account')
    .description('Delete a user account')
    .argument('[username]', 'username to delete', 'User')
    .action(async (username: string) => {
      const response = await deleteAccount(username);
      // eslint-disable-next-line no-console
      console.log(response);
      process.exit(0);
    });
} 