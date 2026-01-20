import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Plus, Search } from "lucide-react";
import { useTickets } from "../../hooks/useTickets";
import { formatRelativeTime } from "../../utils/helpers";
import { STATUS_COLORS, PRIORITY_COLORS } from "../../utils/constants";

export const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState({
    search: "",
    status: "",
    priority: "",
  });

  const { tickets, isLoading } = useTickets(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Maintenance Requests
          </h1>
          <p className="text-gray-600 mt-1">
            Track and manage your maintenance requests
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate("/tenant/tickets/new")}
        >
          <Plus size={20} />
          New Request
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No maintenance requests found</p>
            <Button
              variant="primary"
              onClick={() => navigate("/tenant/tickets/new")}
            >
              Create First Request
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tenant/tickets/${ticket.id}`)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {ticket.ticketNumber}
                      </span>
                      <Badge className={STATUS_COLORS[ticket.status]}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <Badge className={PRIORITY_COLORS[ticket.priority]}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {ticket.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {ticket.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{ticket.category}</span>
                    {ticket.unit && (
                      <>
                        <span>•</span>
                        <span>Unit {ticket.unit.unitNumber}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
