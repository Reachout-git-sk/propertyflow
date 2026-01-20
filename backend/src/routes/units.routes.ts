import { Router } from 'express';
import { UnitsController } from '../controllers/units.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();
const unitsController = new UnitsController();

router.use(authenticate);

router.get('/', unitsController.getUnits);
router.get('/available', authorize('ADMIN'), unitsController.getAvailableUnits);

export default router;