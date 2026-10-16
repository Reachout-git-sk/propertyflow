import api from './api';

// The answer to POST /auth/invites. The server keeps only a hash of inviteCode,
// so this is the one time anybody sees the code.
export interface Invite {
  email: string;
  role: string;
  inviteCode: string;
  expiresAt: string;
}

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data.data;
  },
  async createInvite(email: string, role: string): Promise<Invite> {
    const response = await api.post('/auth/invites', { email, role });
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
