import banbury from '@banbury/core';

export * from './commands';

export async function deleteAccount(): Promise<{ result: string; } | 'failed' | 'exists' | 'task_add failed'> {
    const response = await banbury.settings.deleteAccount();
    
    if (response === 'failed' || response === 'exists' || response === 'task_add failed') {
        return response;
    }
    
    return { result: String(response)};
} 
