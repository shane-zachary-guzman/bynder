/**
 * Collection routes — mounted at `/api/collections` in `server.ts`.
 *
 * | Method | Path   | Middleware                           | Handler            |
 * |--------|--------|--------------------------------------|--------------------|
 * | GET    | /      | authenticate                         | getCollections     |
 * | POST   | /      | authenticate, checkCollectionLimit   | createCollection   |
 * | GET    | /:id   | authenticate                         | getCollection      |
 * | PUT    | /:id   | authenticate                         | updateCollection   |
 * | DELETE | /:id   | authenticate                         | deleteCollection   |
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkCollectionLimit } from '../middleware/planGuard.middleware';
import {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
} from '../controllers/collection.controller';

const router = Router();

router.get('/', authenticate, getCollections);
router.post('/', authenticate, checkCollectionLimit, createCollection);
router.get('/:id', authenticate, getCollection);
router.put('/:id', authenticate, updateCollection);
router.delete('/:id', authenticate, deleteCollection);

export default router;
