import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Users, Wrench, Ticket, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data.data;
    },
  });

  const overviewStats = [
    { label: 'Total Tenants', value: stats?.overview.totalTenants || 0, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Active Workers', value: stats?.overview.totalWorkers || 0, icon: Wrench, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Open Tickets', value: (stats?.tickets.byStatus.new + stats?.tickets.byStatus.assigned + stats?.tickets.byStatus.inProgress) || 0, icon: Ticket, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { label: 'Overdue', value: stats?.tickets.overdue || 0, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, i) => (
          <Card key={i}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Recent Activity">
        <p className="text-gray-500">System activity will appear here</p>
      </Card>
    </div>
  );
};
