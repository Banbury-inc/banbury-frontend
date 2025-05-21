import { Command } from 'commander';
import { deleteAccount } from './index';

export function addSettingsCommands(program: Command): void {
  const settingsCommand = program
    .command('settings')
    .description('Settings-related commands');

  settingsCommand
    .command('delete-account')
    .description('Delete a user account')
    .action(async () => {
      const response = await deleteAccount();
      // eslint-disable-next-line no-console
      console.log(response);
      process.exit(0);
    });
} 