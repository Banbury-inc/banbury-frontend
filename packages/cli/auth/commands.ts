import { Command } from 'commander';
import { login } from './index';

export function addAuthCommands(program: Command): void {
  const authCommand = program
    .command('auth')
    .description('Authentication-related commands');

  authCommand
    .command('login')
    .description('Login to the Banbury server')
    .argument('[username]', 'username to login to', 'User')
    .argument('[password]', 'password to login to', 'Password')
    .action(async (username: string, password: string) => {
      const response = await login();
      // eslint-disable-next-line no-console
      console.log(response);
      process.exit(0);
    });
} 