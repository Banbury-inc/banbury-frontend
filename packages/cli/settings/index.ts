import banbury from '@banbury/core';

export * from './commands';

export async function deleteAccount(username: string): Promise<{ result: string; username: string; } | 'failed' | 'exists' | 'task_add failed'> {
    const response = await banbury.settings.deleteAccount(username);
    
    if (response === 'failed' || response === 'exists' || response === 'task_add failed') {
        return response;
    }
    
    return { result: String(response), username };
} 
