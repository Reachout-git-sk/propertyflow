import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Search, Filter, AlertCircle } from "lucide-react";
import api from "../../services/api";
import { formatRelativeTime } from "../../utils/helpers";
import { STATUS_COLORS, PRIORITY_COLORS } from "../../utils/constants";

export const TicketManagement = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState({
    search: "",
    status: "",
    priority: "",
    category: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", filters],
    queryFn: async () => {
      const response = await api.get("/tickets", { params: filters });
      return response.data.data;
    },
  });

  const tickets = data?.tickets || [];

  const clearFilters = () => {
    setFilters({ search: "", status: "", priority: "", category: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ticket Management</h1>
        <p className="text-gray-600 mt-1">
          ServiceNow-style ticket management dashboard
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={clearFilters}
            className="ml-auto"
          >
            Clear All
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <Input
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="pl-10"
            />
          </div>
          <Select
            options={[
              { value: "", label: "All Statuses" },
              { value: "NEW", label: "New" },
              { value: "ASSIGNED", label: "Assigned" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "COMPLETED", label: "Completed" },
            ]}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          />
          <Select
            options={[
              { value: "", label: "All Priorities" },
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "EMERGENCY", label: "Emergency" },
            ]}
            value={filters.priority}
            onChange={(e) =>
              setFilters({ ...filters, priority: e.target.value })
            }
          />
          <Select
            options={[
              { value: "", label: "All Categories" },
              { value: "PLUMBING", label: "Plumbing" },
              { value: "ELECTRICAL", label: "Electrical" },
              { value: "HVAC", label: "HVAC" },
              { value: "APPLIANCE", label: "Appliance" },
              { value: "STRUCTURAL", label: "Structural" },
              { value: "PEST_CONTROL", label: "Pest Control" },
              { value: "GENERAL", label: "General" },
            ]}
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket: any) => {
                  const isOverdue =
                    ticket.slaDeadline &&
                    new Date(ticket.slaDeadline) < new Date() &&
                    !["COMPLETED", "CLOSED", "CANCELLED"].includes(
                      ticket.status,
                    );

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-blue-600">
                          {ticket.ticketNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {ticket.title}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.tenant
                          ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.unit?.unitNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {ticket.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={PRIORITY_COLORS[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={STATUS_COLORS[ticket.status]}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatRelativeTime(ticket.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
