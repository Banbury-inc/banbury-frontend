import banbury from '@banbury/core';
import inquirer from 'inquirer';

export * from './commands';

export async function login() {
    // ask for username and password
    const { username } = await inquirer.prompt([{ type: 'input', name: 'username', message: 'Enter your username:' }]);
    const { password } = await inquirer.prompt([{ type: 'password', name: 'password', message: 'Enter your password:' }]);


    const response = await banbury.auth.login(username, password);
    return response;
} 
