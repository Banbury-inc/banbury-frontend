#!/usr/bin/env node

import { Command } from 'commander';
import { greetUser } from './greet';
import { getScannedFolders } from './devices';
import chalk from 'chalk';

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


program.parse(); 
