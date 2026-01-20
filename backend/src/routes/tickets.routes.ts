import { Router } from 'express';
import {
  TicketsController,
  createTicketSchema,
  assignTicketSchema,
  updateStatusSchema,
} from '../controllers/tickets.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { upload } from '../config/multer';

const router = Router();
const ticketsController = new TicketsController();

// All routes require authentication
router.use(authenticate);

router.get('/', ticketsController.getTickets);
router.get('/stats', authorize('ADMIN'), ticketsController.getStats);
router.get('/:id', ticketsController.getTicketById);
router.post('/', validate(createTicketSchema), ticketsController.createTicket);
router.post('/:id/assign', authorize('ADMIN'), validate(assignTicketSchema), ticketsController.assignTicket);
router.patch('/:id/status', authorize('ADMIN', 'WORKER'), validate(updateStatusSchema), ticketsController.updateStatus);
router.post('/:id/attachments', upload.single('file'), ticketsController.uploadAttachment);

export default router;