export function greetUser(name: string = 'User'): string {
    const now = new Date();
    const time = now.getHours();
    let greeting = 'Hello';
    
    if (time < 12) {
        greeting = 'Good morning';
    } else if (time < 18) {
        greeting = 'Good afternoon';
    } else {
        greeting = 'Good evening';
    }
    
    return `${greeting}, ${name}!`;
} 