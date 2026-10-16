import { Router } from 'express';
import { AuthController, signupSchema, loginSchema, inviteSchema } from '../controllers/auth.controller';
import { validate } from '../middleware/validator';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { loginAccountLimiter, loginIpLimiter } from '../middleware/loginRateLimit';

const router = Router();
const authController = new AuthController();

router.post('/invites', authenticate, authorize('ADMIN'), validate(inviteSchema), authController.createInvite);
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', loginIpLimiter, loginAccountLimiter, validate(loginSchema), authController.login);
router.get('/profile', authenticate, authController.getProfile);

export default router;