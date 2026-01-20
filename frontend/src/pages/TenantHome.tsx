import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { TenantDashboard } from "../components/tenant/TenantDashboard";
import { TicketList } from "../components/tenant/TicketList";
import { TicketForm } from "../components/tenant/TicketForm";
import { TicketDetail } from "../components/tenant/TicketDetail";

export const TenantHome: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<TenantDashboard />} />
        <Route path="tickets" element={<TicketList />} />
        <Route path="tickets/new" element={<TicketForm />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="*" element={<Navigate to="/tenant" replace />} />
      </Routes>
    </DashboardLayout>
  );
};
