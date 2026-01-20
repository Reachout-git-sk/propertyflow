import React from 'react';
import { useParams } from 'react-router-dom';
import { useTicketDetail } from '../../hooks/useTickets';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';

export const TicketDetail: React.FC = () => {
  const { id } = useParams();
  const { ticket, isLoading } = useTicketDetail(id!);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!ticket) return <p>Ticket not found</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ticket.ticketNumber}</h1>
      <Card>
        <div className="flex gap-3 mb-4">
          <Badge className={STATUS_COLORS[ticket.status]}>{ticket.status}</Badge>
          <Badge className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
        </div>
        <h2 className="text-xl font-semibold mb-2">{ticket.title}</h2>
        <p className="text-gray-700">{ticket.description}</p>
      </Card>
    </div>
  );
};
