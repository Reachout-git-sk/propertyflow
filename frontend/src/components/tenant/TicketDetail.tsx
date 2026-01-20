import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { useTicketDetail } from "../../hooks/useTickets";
import { formatDateTime } from "../../utils/helpers";
import { STATUS_COLORS, PRIORITY_COLORS } from "../../utils/constants";

export const TicketDetail = () => {
  const params = useParams();
  const navigate = useNavigate();
  const ticketId = params.id || "";
  const { ticket, isLoading } = useTicketDetail(ticketId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ticket not found</p>
        <Button onClick={() => navigate("/tenant/tickets")} className="mt-4">
          Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate("/tenant/tickets")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {ticket.ticketNumber}
          </h1>
          <p className="text-gray-600">{ticket.title}</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Badge className={STATUS_COLORS[ticket.status]}>
            {ticket.status.replace("_", " ")}
          </Badge>
          <Badge className={PRIORITY_COLORS[ticket.priority]}>
            {ticket.priority} Priority
          </Badge>
          <span className="text-sm text-gray-500 ml-auto">
            {ticket.category}
          </span>
        </div>
      </Card>

      <Card title="Request Details">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Description
            </h3>
            <p className="text-gray-900">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <MapPin className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">
                  {ticket.unit ? `Unit ${ticket.unit.unitNumber}` : "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(ticket.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {ticket.assignments && ticket.assignments.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Assigned Workers
              </h3>
              <div className="space-y-2">
                {ticket.assignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <p className="font-medium text-gray-900">
                      {assignment.worker.user.firstName}{" "}
                      {assignment.worker.user.lastName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {ticket.activityLogs && ticket.activityLogs.length > 0 && (
        <Card title="Activity Timeline">
          <div className="space-y-4">
            {ticket.activityLogs.map((log: any) => (
              <div key={log.id} className="flex gap-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                  <p className="text-sm font-medium text-gray-900">
                    {log.action}
                  </p>
                  {log.notes && (
                    <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
