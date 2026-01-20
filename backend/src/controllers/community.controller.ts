import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    category: z.string().optional(),
  }),
});

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1),
  }),
});

export class CommunityController {
  async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { isActive: true };

      if (category) {
        where.category = category as string;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { content: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.communityPost.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            comments: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              include: {
                author: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            _count: {
              select: { comments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.communityPost.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          posts,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPostById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const post = await prisma.communityPost.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          comments: {
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new AppError('Post not found', 404);
      }

      res.status(200).json({
        success: true,
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, content, category } = req.body;
      const authorId = req.user!.id;

      const post = await prisma.communityPost.create({
        data: {
          authorId,
          title,
          content,
          category: category as any,
        },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async createComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const authorId = req.user!.id;

      const comment = await prisma.postComment.create({
        data: {
          postId: id,
          authorId,
          content,
        },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const post = await prisma.communityPost.findUnique({
        where: { id },
      });

      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Only author or admin can delete
      if (post.authorId !== userId && userRole !== 'ADMIN') {
        throw new AppError('You do not have permission to delete this post', 403);
      }

      await prisma.communityPost.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}