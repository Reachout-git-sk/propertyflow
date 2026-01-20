import api from './api';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data.data;
  },
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data.data;
  },
  logout() {
    localStorage.clear();
  },
};
