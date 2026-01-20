import api from './api';

export const ticketService = {
  async getTickets(params?: any) {
    const response = await api.get('/tickets', { params });
    return response.data.data;
  },
  async getTicketById(id: string) {
    const response = await api.get(`/tickets/${id}`);
    return response.data.data;
  },
  async createTicket(data: any) {
    const response = await api.post('/tickets', data);
    return response.data.data;
  },
  async assignTicket(id: string, data: any) {
    const response = await api.post(`/tickets/${id}/assign`, data);
    return response.data.data;
  },
  async updateStatus(id: string, status: string, notes?: string) {
    const response = await api.patch(`/tickets/${id}/status`, { status, notes });
    return response.data.data;
  },
};
