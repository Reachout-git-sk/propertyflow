import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { runWithDbContext } from '../config/database';
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

    req.user = decoded as any;

    // Everything after this point (routes, services, database queries) runs "as" this
    // user, so the database's row-level security policies know who is asking.
    runWithDbContext({ userId: decoded.id, role: decoded.role }, () => next());
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    next(error);
  }
};