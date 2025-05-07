#!/usr/bin/env node

import { Command } from 'commander';
import { greetUser } from './greet';
import { getScannedFolders } from './devices';
import chalk from 'chalk';
import { deleteAccount } from './settings';
import { login } from './auth';
import { banbury } from '@banbury/core';

const program = new Command();

banbury.middleware.loadGlobalAxiosAuthToken();

program
  .name('banbury')
  .description('Banbury CLI tool')
  .version('3.4.22');


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

program.parse(); 
