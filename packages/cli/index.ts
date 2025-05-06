#!/usr/bin/env node

import { Command } from 'commander';
import { greetUser } from './greet';
import { getScannedFolders } from './devices';
import chalk from 'chalk';
import { deleteAccount } from './settings';
import { login, logout, isLoggedIn, getAuthStatus } from './authentication';
import * as readline from 'readline';

const program = new Command();

program
  .name('banbury')
  .description('Banbury CLI tool')
  .version('3.4.22');

program
  .command('greet')
  .description('Greet a user with a time-appropriate message')
  .argument('[name]', 'name of the user to greet', 'User')
  .action((name: string) => {
    const greeting = greetUser(name);
    // eslint-disable-next-line no-console
    console.log(chalk.blue(greeting));
  });

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

// Add authentication commands
const authCommand = program
.command('auth')
.description('Authentication-related commands');

authCommand
.command('login')
.description('Login to Banbury')
.action(async () => {
  // Create a readline interface for secure user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Prompt for username
  rl.question('Username: ', (username) => {
    // Use muted input for password
    rl.question('Password: ', async (password) => {
      rl.close();
      const response = await login(username, password);
      console.log(chalk.blue(response));
      process.exit(0);
    });
    // Hide password input (hacky way in Node.js CLI)
    (rl as any)._writeToOutput = function _writeToOutput(stringToWrite: string) {
      if (stringToWrite.includes('Password')) {
        (rl as any).output.write('Password: ');
      } else if (!(rl as any).lastInput) {
        (rl as any).output.write('*');
      }
    };
  });
});

authCommand
.command('logout')
.description('Logout from Banbury')
.action(() => {
  const response = logout();
  console.log(chalk.blue(response));
  process.exit(0);
});

authCommand
.command('status')
.description('Check login status')
.action(() => {
  const status = getAuthStatus();
  if (status.loggedIn) {
    console.log(chalk.green('✓ Logged in'));
    console.log(chalk.blue(`Username: ${status.username}`));
    console.log(chalk.blue(`Device ID: ${status.deviceId}`));
    
    // Show token expiry with color based on time remaining
    const tokenColor = status.tokenExpiry === 'Expired' ? 
      chalk.red : 
      (status.tokenExpiry?.includes('5') ? chalk.yellow : chalk.green);
    
    console.log(tokenColor(`Token expires in: ${status.tokenExpiry}`));
  } else {
    console.log(chalk.red('✗ Not logged in'));
    console.log(chalk.yellow('Use "banbury auth login" to authenticate'));
  }
  process.exit(0);
});

program.parse(); 
