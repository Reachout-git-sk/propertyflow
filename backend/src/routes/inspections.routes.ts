import { Router } from 'express';
import { InspectionsController, createInspectionSchema } from '../controllers/inspections.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validator';

const router = Router();
const inspectionsController = new InspectionsController();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', inspectionsController.getInspections);
router.post('/', validate(createInspectionSchema), inspectionsController.createInspection);
router.post('/:id/complete', inspectionsController.completeInspection);

export default router;