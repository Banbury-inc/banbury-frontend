# Banbury CLI

The Banbury CLI is a command-line interface for interacting with the Banbury platform. It provides various commands for managing devices, connecting to websockets, and more.

## Installation

```bash
# Install globally
npm install -g @banbury/cli

# Or run directly with npx
npx @banbury/cli [command]
```

## Available Commands

### Greeting

```bash
# Greet with default name
banbury greet

# Greet with a specific name
banbury greet John
```

### Device Management

```bash
# Get scanned folders for a user
banbury device get-scanned-folders

# Get scanned folders for a specific user
banbury device get-scanned-folders myusername
```

### WebSocket Connection

```bash
# Connect to websocket with default username
banbury websocket connect

# Connect with a specific username
banbury websocket connect myusername

# Connect with verbose output
banbury websocket connect --verbose

# Connect with a specific device name
banbury websocket connect --device mydevice

# Combine options
banbury websocket connect myusername --device mydevice --verbose
```

The websocket connection command will:
- Establish a connection to the Banbury websocket server
- Display received messages in real-time
- Allow you to disconnect cleanly by pressing Ctrl+C

## Development

### Building the CLI

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Running Tests

```bash
npm test
```

### Adding New Commands

To add a new command:

1. Create a new directory in the `packages/cli` folder for your command category
2. Create an `index.ts` file with your command implementation
3. Export a registration function that takes a `Command` object
4. Import and call your registration function in the main `index.ts` file

Example:

```typescript
// packages/cli/mycommand/index.ts
import { Command } from 'commander';

export function myCommand(username: string, options: any): void {
  console.log(`Hello, ${username}!`);
}

export function registerMyCommands(program: Command): void {
  program
    .command('mycommand')
    .description('Description of my command')
    .argument('[username]', 'username to use', 'User')
    .option('-o, --option <value>', 'some option')
    .action((username: string, options: any) => {
      myCommand(username, options);
    });
}

// In packages/cli/index.ts
import { registerMyCommands } from './mycommand';
// ...
registerMyCommands(program);
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 