import React from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { WorkerDashboard } from '../components/worker/WorkerDashboard';

export const WorkerHome: React.FC = () => {
  return (
    <DashboardLayout>
      <WorkerDashboard />
    </DashboardLayout>
  );
};
