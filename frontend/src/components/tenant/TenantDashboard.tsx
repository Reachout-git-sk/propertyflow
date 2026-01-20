import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Plus, Clock, CheckCircle, AlertCircle } from "lucide-react";
import api from "../../services/api";
import { formatRelativeTime } from "../../utils/helpers";
import { STATUS_COLORS, PRIORITY_COLORS } from "../../utils/constants";

export const TenantDashboard = () => {
  const navigate = useNavigate();

  const { data: tickets } = useQuery({
    queryKey: ["tenant-tickets"],
    queryFn: async () => {
      const response = await api.get("/tickets", { params: { limit: 5 } });
      return response.data.data.tickets;
    },
  });

  const stats = [
    {
      label: "Active Requests",
      value:
        tickets?.filter(
          (t: any) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(t.status),
        ).length || 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      label: "Completed",
      value: tickets?.filter((t: any) => t.status === "COMPLETED").length || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Urgent",
      value:
        tickets?.filter(
          (t: any) => t.priority === "EMERGENCY" || t.priority === "HIGH",
        ).length || 0,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
        <p className="text-blue-100 mb-6">
          Manage your maintenance requests and stay updated
        </p>
        <Button
          variant="secondary"
          className="bg-white text-blue-600 hover:bg-gray-100"
          onClick={() => navigate("/tenant/tickets/new")}
        >
          <Plus size={20} />
          Report a Problem
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}
              >
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

      <Card title="Recent Maintenance Requests">
        {tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-all cursor-pointer"
                onClick={() => navigate(`/tenant/tickets/${ticket.id}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">{ticket.ticketNumber}</span>
                  <Badge className={STATUS_COLORS[ticket.status]}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                  <Badge className={PRIORITY_COLORS[ticket.priority]}>
                    {ticket.priority}
                  </Badge>
                </div>
                <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {ticket.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>{ticket.category}</span>
                  <span>{formatRelativeTime(ticket.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No maintenance requests yet</p>
            <Button
              variant="primary"
              onClick={() => navigate("/tenant/tickets/new")}
            >
              Create First Request
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
