import { Router } from 'express';
import {
  CommunityController,
  createPostSchema,
  createCommentSchema,
} from '../controllers/community.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();
const communityController = new CommunityController();

router.use(authenticate);

router.get('/posts', communityController.getPosts);
router.get('/posts/:id', communityController.getPostById);
router.post('/posts', validate(createPostSchema), communityController.createPost);
router.post('/posts/:id/comments', validate(createCommentSchema), communityController.createComment);
router.delete('/posts/:id', communityController.deletePost);

export default router;