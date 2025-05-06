import axios from 'axios';
import { getAuthConfig, getAuthHeaderWithRefresh } from '../authentication';

export async function getScannedFolders(username: string): Promise<{ result: string; username: string; } | 'failed' | 'exists' | 'task_add failed'> {
    try {
        // Get authentication headers with token refresh if needed
        const authHeaders = await getAuthHeaderWithRefresh();
        
        // If no authentication headers, we're not logged in
        if (!authHeaders.Authorization) {
            return 'failed';
        }
        
        // Get API URL from auth config
        const authConfig = getAuthConfig();
        const apiUrl = authConfig.api_url || 'http://www.api.dev.banbury.io/';
        
        // Make authenticated request
        const response = await axios.get(
            `${apiUrl}devices/getscannedfolders/${username}/`,
            { headers: authHeaders }
        );
        
        return response.data;
    } catch (error) {
        console.error('Error fetching scanned folders:', error);
        return 'failed';
    }
} 
