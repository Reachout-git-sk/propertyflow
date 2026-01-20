import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { z } from 'zod';

const ticketService = new TicketService();

export const createTicketSchema = z.object({
  body: z.object({
    unitId: z.string().uuid(),
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.string(),
    priority: z.string().optional(),
  }),
});

export const assignTicketSchema = z.object({
  body: z.object({
    workerIds: z.array(z.string().uuid()).min(1, 'At least one worker must be assigned'),
    notes: z.string().optional(),
    estimatedCompletion: z.string().datetime().optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.string(),
    notes: z.string().optional(),
  }),
});

export class TicketsController {
  async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { unitId, title, description, category, priority } = req.body;
      const tenantId = req.user!.id;

      const ticket = await ticketService.createTicket({
        tenantId,
        unitId,
        title,
        description,
        category: category as any,
        priority: priority as any,
      });

      res.status(201).json({
        success: true,
        message: 'Maintenance request submitted successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, priority, category, search, page, limit } = req.query;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const filters: any = {
        status: status as any,
        priority: priority as any,
        category: category as any,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      };

      // If tenant, only show their tickets
      if (userRole === 'TENANT') {
        filters.tenantId = userId;
      }

      const result = await ticketService.getTickets(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const ticket = await ticketService.getTicketById(id);

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { workerIds, notes, estimatedCompletion } = req.body;
      const assignedBy = req.user!.id;

      const assignments = await ticketService.assignTicket(
        id,
        workerIds,
        assignedBy,
        notes,
        estimatedCompletion ? new Date(estimatedCompletion) : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Ticket assigned successfully',
        data: assignments,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user!.id;

      const ticket = await ticketService.updateTicketStatus(id, status as any, userId, notes);

      res.status(200).json({
        success: true,
        message: 'Ticket status updated successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const attachment = await ticketService.addAttachment(
        id,
        userId,
        file.originalname,
        file.path,
        file.mimetype,
        file.size
      );

      res.status(201).json({
        success: true,
        message: 'Attachment uploaded successfully',
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await ticketService.getTicketStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}