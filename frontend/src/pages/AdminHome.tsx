import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { AdminDashboard } from "../components/admin/AdminDashboard";
import { TicketManagement } from "../components/admin/TicketManagement";
import { TicketDetail } from "../components/admin/TicketDetail";
import { TenantManagement } from "../components/admin/TenantManagement";

export const AdminHome = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="tickets" element={<TicketManagement />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="tenants" element={<TenantManagement />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
};
