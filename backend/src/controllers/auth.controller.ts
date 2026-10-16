import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const authService = new AuthService();

// The rules for every new password, whether the user picks it (sign-up) or an admin does
export const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[@$!%*?&#]/, 'Password must contain at least one special character');

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: strongPassword,
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
    // The one-time code from the admin's invite (POST /api/auth/invites)
    inviteCode: z.string({ required_error: 'Invite code is required' }).min(1).max(100),
  }),
});

export const inviteSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    role: z.enum(['ADMIN', 'TENANT', 'WORKER']),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, inviteCode, phone } = req.body;

      const result = await authService.signup(email, password, firstName, lastName, inviteCode, phone);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, role } = req.body;

      const invite = await authService.createInvite(email, role, req.user!.id);

      res.status(201).json({
        success: true,
        message: 'Invite created. Give the code to this person yourself; it is shown only once.',
        data: invite,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login(email, password);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      const profile = await authService.getProfile(userId);
      
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}