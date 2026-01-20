import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export class UnitsController {
  async getUnits(req: Request, res: Response, next: NextFunction) {
    try {
      const units = await prisma.unit.findMany({
        include: {
          property: {
            select: {
              name: true,
              address: true,
            },
          },
          tenancies: {
            where: { status: 'ACTIVE' as any },
            include: {
              tenant: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { unitNumber: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: units,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableUnits(req: Request, res: Response, next: NextFunction) {
    try {
      const units = await prisma.unit.findMany({
        where: { isOccupied: false },
        include: {
          property: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { unitNumber: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: units,
      });
    } catch (error) {
      next(error);
    }
  }
}