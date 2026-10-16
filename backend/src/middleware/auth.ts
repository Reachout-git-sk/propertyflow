import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import prisma, { runWithDbContext } from '../config/database';
import { AppError } from './errorHandler';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    // Only accept tokens signed with our secret using HS256 (the algorithm we sign with)
    const decoded = jwt.verify(token, jwtConfig.secret, { algorithms: ['HS256'] }) as JwtPayload;

    // A signed token cannot be taken back before it expires (up to 1 hour). So look the
    // account up on every request: a deactivated or deleted user is refused at once, and
    // the role comes from the database, not from what the token said when it was issued.
    // Cost: one lookup by primary key per request (the users table is not under RLS).
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Your session has ended. Please log in again.', 401);
    }

    req.user = { id: user.id, email: user.email, role: user.role };

    // Everything after this point (routes, services, database queries) runs "as" this
    // user, so the database's row-level security policies know who is asking.
    runWithDbContext({ userId: user.id, role: user.role }, () => next());
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    next(error);
  }
};