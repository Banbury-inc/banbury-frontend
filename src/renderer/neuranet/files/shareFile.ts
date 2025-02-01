
import axios from 'axios';
import { CONFIG } from '../../config/config';

export async function shareFile(
    file_name: string,
    username: string | null,
    friend_username: string | null,
) {

    let url = ''

    try {

        url = `${CONFIG.url}/files/share_file/`;


        const response = await axios.post<{ status: string; message: string; }>(url, {
            file_name: file_name,
            username: username,
            friend_username: friend_username,
        });
        const status = response.data.status;

        if (status === 'success') {


            return response;
        }
        if (status === 'fail') {
            return 'share_file failed';
        }

        else {
            return 'share_file failed';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return 'error'; // Ensure an error is returned if the request fails
    }
}

