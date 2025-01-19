export async function update_scan_progress(username: string, progress: number): Promise<void> {
    try {
        console.log('Updating scan progress:', progress);
    } catch (error) {
        console.error('Error updating scan progress:', error);
    }
} 