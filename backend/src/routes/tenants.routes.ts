import { Router } from 'express';
import { TenantsController, createTenantSchema, updateTenantSchema } from '../controllers/tenants.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validator';

const router = Router();
const tenantsController = new TenantsController();

router.use(authenticate);

// Tenants may call these, but only ever get their own record back (see the controller)
router.get('/', authorize('ADMIN', 'TENANT'), tenantsController.getTenants);
router.get('/:id', authorize('ADMIN', 'TENANT'), tenantsController.getTenantById);
router.post('/', authorize('ADMIN'), validate(createTenantSchema), tenantsController.createTenant);
router.patch('/:id', authorize('ADMIN'), tenantsController.updateTenant);
router.delete('/:id/deactivate', authorize('ADMIN'), tenantsController.deactivateTenant);
router.delete('/:id', authorize('ADMIN'), tenantsController.deleteTenant);

export default router;