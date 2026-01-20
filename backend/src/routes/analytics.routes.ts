import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();
const analyticsController = new AnalyticsController();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/workers/performance', analyticsController.getWorkerPerformance);

export default router;