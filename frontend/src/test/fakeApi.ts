import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import api from '../services/api';

// Stands in for the backend. Every request made through our api client gets this reply,
// after the client's real interceptors ran (so the token header is added as in the app).
// Returns the list of requests, so a test can check what the page sent.
export function fakeBackendReply(status: number, body: unknown) {
  const requests: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    const response: AxiosResponse = { data: body, status, statusText: '', headers: {}, config };
    if (status >= 400) {
      // What axios itself throws for an error status
      throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response);
    }
    return response;
  };
  return requests;
}
