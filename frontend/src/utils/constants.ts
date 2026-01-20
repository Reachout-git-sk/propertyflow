const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';
export { API_URL };

export const TICKET_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  EMERGENCY: 'Emergency',
};

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  HVAC: 'HVAC',
  APPLIANCE: 'Appliance',
  STRUCTURAL: 'Structural',
  PEST_CONTROL: 'Pest Control',
  GENERAL: 'General',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  EMERGENCY: 'bg-red-100 text-red-700',
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-purple-100 text-purple-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  ON_HOLD: 'bg-gray-100 text-gray-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};