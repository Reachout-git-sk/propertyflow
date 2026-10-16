import { Router } from 'express';
import { AuthController, signupSchema, loginSchema } from '../controllers/auth.controller';
import { validate } from '../middleware/validator';
import { authenticate } from '../middleware/auth';
import { loginAccountLimiter, loginIpLimiter } from '../middleware/loginRateLimit';

const router = Router();
const authController = new AuthController();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', loginIpLimiter, loginAccountLimiter, validate(loginSchema), authController.login);
router.get('/profile', authenticate, authController.getProfile);

export default router;