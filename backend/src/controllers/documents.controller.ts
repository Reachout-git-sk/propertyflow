import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ownedBy } from '../utils/access';
import { sendStoredFile } from '../utils/files';

export class DocumentsController {
  async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenancyId } = req.query;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const where: any = { isCurrent: true };

      if (tenancyId) {
        where.tenancyId = tenancyId as string;
      }

      // If tenant, only show their documents
      if (userRole === 'TENANT') {
        where.tenancy = {
          tenantId: userId,
        };
      }

      const documents = await prisma.document.findMany({
        where,
        include: {
          tenancy: {
            include: {
              tenant: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              unit: {
                select: {
                  unitNumber: true,
                },
              },
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenancyId, documentType } = req.body;
      const uploadedBy = req.user!.id;
      const file = req.file;

      if (!file) {
        throw new AppError('No file uploaded', 400);
      }

      // A tenant may only upload to their own tenancy (otherwise they could
      // also replace another tenant's "current" lease below)
      const tenancy = await prisma.tenancy.findFirst({
        where: { id: tenancyId, ...ownedBy(req.user!) },
      });
      if (!tenancy) {
        throw new AppError('Tenancy not found', 404);
      }

      // Mark previous versions as not current
      await prisma.document.updateMany({
        where: {
          tenancyId,
          documentType: documentType as any,
        },
        data: {
          isCurrent: false,
        },
      });

      // Get next version number
      const lastVersion = await prisma.document.findFirst({
        where: {
          tenancyId,
          documentType: documentType as any,
        },
        orderBy: { version: 'desc' },
      });

      const version = lastVersion ? lastVersion.version + 1 : 1;

      const document = await prisma.document.create({
        data: {
          tenancyId,
          documentType: documentType as any,
          fileName: file.originalname,
          filePath: file.path,
          uploadedBy,
          version,
          isCurrent: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Someone else's document gets the same 404 as a missing one.
      // (A 403 would confirm that the id exists.)
      const document = await prisma.document.findFirst({
        where: { id, tenancy: ownedBy(req.user!) },
      });

      if (!document) {
        throw new AppError('Document not found', 404);
      }

      sendStoredFile(res, document.filePath, document.fileName);
    } catch (error) {
      next(error);
    }
  }
}