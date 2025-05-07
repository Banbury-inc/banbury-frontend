#!/usr/bin/env node

import { Command } from 'commander';
import { banbury } from '@banbury/core';
import { addAuthCommands } from './auth/commands';
import { addDeviceCommands } from './devices/commands';
import { addSettingsCommands } from './settings/commands';

const program = new Command();

banbury.middleware.loadGlobalAxiosAuthToken();

program
  .name('banbury')
  .description('Banbury CLI tool')
  .version('3.4.22');

// Add all commands
addAuthCommands(program);
addDeviceCommands(program);
addSettingsCommands(program);

program.parse(); 
