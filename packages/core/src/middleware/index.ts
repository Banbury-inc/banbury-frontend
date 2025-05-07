import { setGlobalAxiosAuthToken, loadGlobalAxiosAuthToken } from './axiosGlobalHeader';

// Initialize token loading
loadGlobalAxiosAuthToken();

export {
  setGlobalAxiosAuthToken,
  loadGlobalAxiosAuthToken
};