import React from 'react';
import { Card } from '../ui/Card';

export const WorkerDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Worker Dashboard</h1>
      <Card title="My Assignments">
        <p className="text-gray-500">Your assigned tickets will appear here</p>
      </Card>
    </div>
  );
};
