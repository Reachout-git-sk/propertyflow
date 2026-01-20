import { Router } from 'express';
import { WorkersController, updateWorkerSchema } from '../controllers/workers.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validator';

const router = Router();
const workersController = new WorkersController();

router.use(authenticate);

router.get('/', authorize('ADMIN'), workersController.getWorkers);
router.get('/:id', authorize('ADMIN', 'WORKER'), workersController.getWorkerById);
router.patch('/:id', authorize('ADMIN'), validate(updateWorkerSchema), workersController.updateWorker);
router.get('/:id/stats', authorize('ADMIN', 'WORKER'), workersController.getWorkerStats);

export default router;