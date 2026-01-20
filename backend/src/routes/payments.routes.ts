import { Router } from 'express';
import { PaymentsController, createPaymentSchema } from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { upload } from '../config/multer';

const router = Router();
const paymentsController = new PaymentsController();

router.use(authenticate);

router.get('/', paymentsController.getPayments);
router.post('/', authorize('TENANT', 'ADMIN'), validate(createPaymentSchema), paymentsController.createPayment);
router.patch('/:id/status', authorize('ADMIN'), paymentsController.updatePaymentStatus);
router.post('/:id/receipt', upload.single('receipt'), paymentsController.uploadReceipt);

export default router;