import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../services/ticket.service';

export const useTickets = (filters?: any) => {
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => ticketService.getTickets(filters),
  });

  return {
    tickets: data?.tickets || [],
    pagination: data?.pagination,
    isLoading,
  };
};

export const useTicketDetail = (id: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getTicketById(id),
    enabled: !!id,
  });

  return { ticket: data, isLoading };
};
