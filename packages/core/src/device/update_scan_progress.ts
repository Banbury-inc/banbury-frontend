export async function update_scan_progress(username: string, progress: number): Promise<void> {
    // For now, just log the progress. You can implement actual progress tracking later
    console.log(`Scan progress for ${username}: ${progress}%`);
} 