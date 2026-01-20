import { Router } from 'express';
import { DocumentsController } from '../controllers/documents.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../config/multer';

const router = Router();
const documentsController = new DocumentsController();

router.use(authenticate);

router.get('/', documentsController.getDocuments);
router.post('/', authorize('TENANT', 'ADMIN'), upload.single('document'), documentsController.uploadDocument);
router.get('/:id/download', documentsController.downloadDocument);

export default router;