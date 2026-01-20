export interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  tenant?: { firstName: string; lastName: string };
  unit?: { unitNumber: string; property: { name: string } };
  assignments?: any[];
  activityLogs?: any[];
  attachments?: any[];
}

export interface Worker {
  id: string;
  user: { firstName: string; lastName: string; email: string; isActive: boolean };
  companyName?: string;
  skills: string[];
  rating: number;
  totalJobs: number;
  availabilityStatus: string;
  activeTickets?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
