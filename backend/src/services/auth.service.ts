import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/passwordHash';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { AppError } from '../middleware/errorHandler';

// Every failed login gets exactly this answer, whatever the reason (no such email, wrong
// password, deactivated account). Different answers would tell an attacker which emails
// have an account here ("account enumeration").
const LOGIN_FAILED = 'Invalid email or password';

// Same idea for sign-up: "not on the approved list" and "already has an account" look
// identical, so sign-up cannot be used to test which emails are approved or registered.
const SIGNUP_REFUSED =
  'Sign-up is not available for this email. If you have an account, log in; otherwise ask your property manager.';

// bcrypt is slow on purpose. If login skipped it for unknown emails, those answers would
// come back faster, and the time alone would show which emails exist. So unknown emails
// are checked against this throwaway hash (made once, with the same cost as real ones).
let hashForUnknownEmails: Promise<string> | undefined;
const dummyHash = () => (hashForUnknownEmails ??= hashPassword('no-account-has-this-password'));

export class AuthService {
  async signup(email: string, password: string, firstName: string, lastName: string, phone?: string) {
    const whitelist = await prisma.emailWhitelist.findUnique({
      where: { email },
    });

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!whitelist || existingUser) {
      throw new AppError(SIGNUP_REFUSED, 403);
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

    // Always check a password first, even for an unknown email (see dummyHash above)
    const isPasswordValid = await comparePassword(password, user?.passwordHash ?? (await dummyHash()));

    // A deactivated account gets the same answer even with the right password.
    // Saying "deactivated" would confirm the password is correct to someone trying
    // leaked passwords (people reuse them on other sites). The admin who deactivated
    // the account can tell the real owner why they cannot log in.
    if (!user || !isPasswordValid || !user.isActive) {
      throw new AppError(LOGIN_FAILED, 401);
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