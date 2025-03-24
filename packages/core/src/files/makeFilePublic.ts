
import axios from 'axios';
import { CONFIG } from '../config';


export async function makeFilePublic(
    username: string | null,
    file_name: string,
    device_name: string,
) {

    let url = ''
    try {
        url = `${CONFIG.url}/files/make_file_public/`;
        const response = await axios.post<{ status: string; message: string; }>(url, {
            file_name: file_name,
            username: username,
            device_name: device_name,
        });
        const status = response.data.status;

        if (status === 'success') {

            return response;
        }
        if (status === 'fail') {
            return 'make_file_public failed';
        }

        else {
            return 'make_file_public failed';
        }
    } catch (error) {
        return error; // Ensure an error is returned if the request fails
    }
}

