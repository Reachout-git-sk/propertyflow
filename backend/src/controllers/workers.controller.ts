import { Request, Response, NextFunction } from 'express';
import { WorkerService } from '../services/worker.service';
import { z } from 'zod';

const workerService = new WorkerService();

export const updateWorkerSchema = z.object({
  body: z.object({
    companyName: z.string().optional(),
    skills: z.array(z.string()).optional(),
    hourlyRate: z.number().positive().optional(),
    availabilityStatus: z.string().optional(),
  }),
});

export class WorkersController {
  async getWorkers(req: Request, res: Response, next: NextFunction) {
    try {
      const { skills, availability } = req.query;

      const filters: any = {};
      if (skills) {
        filters.skills = (skills as string).split(',');
      }
      if (availability) {
        filters.availability = availability as any;
      }

      const workers = await workerService.getWorkers(filters);

      res.status(200).json({
        success: true,
        data: workers,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkerById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const worker = await workerService.getWorkerById(id);

      res.status(200).json({
        success: true,
        data: worker,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateWorker(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body;

      const worker = await workerService.updateWorker(id, data);

      res.status(200).json({
        success: true,
        message: 'Worker updated successfully',
        data: worker,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const stats = await workerService.getWorkerStats(id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}