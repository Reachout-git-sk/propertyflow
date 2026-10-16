import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/passwordHash';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async signup(email: string, password: string, firstName: string, lastName: string, phone?: string) {
    const whitelist = await prisma.emailWhitelist.findUnique({
      where: { email },
    });

    if (!whitelist) {
      throw new AppError('Email not authorized. Please contact administrator.', 403);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User already exists with this email', 400);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: whitelist.role,
        firstName,
        lastName,
        phone,
      },
    });

    if (whitelist.role === 'WORKER') {
      await prisma.worker.create({
        data: {
          userId: user.id,
          skills: [],
          availabilityStatus: 'AVAILABLE' as any,
        },
      });
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Contact administrator.', 403);
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  private generateToken(id: string, email: string, role: any): string {
    return jwt.sign(
      { id, email, role },
      jwtConfig.secret,
      { algorithm: 'HS256', expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
    );
  }
}