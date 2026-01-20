import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Ticket, Users, Wrench } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export const Sidebar = () => {
  const { user } = useAuth();

  const tenantLinks = [
    { to: "/tenant", icon: Home, label: "Dashboard" },
    { to: "/tenant/tickets", icon: Ticket, label: "My Requests" },
  ];

  const adminLinks = [
    { to: "/admin", icon: Home, label: "Dashboard" },
    { to: "/admin/tickets", icon: Ticket, label: "Tickets" },
    { to: "/admin/tenants", icon: Users, label: "Tenants" },
    { to: "/admin/workers", icon: Wrench, label: "Workers" },
  ];

  const workerLinks = [
    { to: "/worker", icon: Home, label: "Dashboard" },
    { to: "/worker/tickets", icon: Ticket, label: "My Assignments" },
  ];

  const links =
    user?.role === "ADMIN"
      ? adminLinks
      : user?.role === "WORKER"
        ? workerLinks
        : tenantLinks;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to.split("/").length === 2}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
