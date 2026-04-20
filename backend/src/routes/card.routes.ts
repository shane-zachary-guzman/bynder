/**
 * Card routes — mounted at `/api/collections` in `server.ts` (shares the collections prefix).
 * Uses `mergeParams: true` so `:collectionId` is available inside card controller handlers.
 *
 * | Method | Path                              | Middleware                    | Handler    |
 * |--------|-----------------------------------|-------------------------------|------------|
 * | GET    | /:collectionId/cards              | authenticate                  | getCards   |
 * | POST   | /:collectionId/cards              | authenticate, checkCardLimit  | createCard       |
 * | POST   | /:collectionId/cards/by-set       | authenticate, checkCardLimit  | createCardBySet  |
 * | GET    | /:collectionId/cards/:id          | authenticate                  | getCard          |
 * | PUT    | /:collectionId/cards/:id          | authenticate                  | updateCard |
 * | DELETE | /:collectionId/cards/:id          | authenticate                  | deleteCard |
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkCardLimit } from '../middleware/planGuard.middleware';
import {
  getCards,
  getCard,
  createCard,
  createCardBySet,
  updateCard,
  deleteCard,
} from '../controllers/card.controller';

const router = Router({ mergeParams: true });

router.get('/:collectionId/cards', authenticate, getCards);
router.post('/:collectionId/cards', authenticate, checkCardLimit, createCard);
router.post('/:collectionId/cards/by-set', authenticate, checkCardLimit, createCardBySet);
router.get('/:collectionId/cards/:id', authenticate, getCard);
router.put('/:collectionId/cards/:id', authenticate, updateCard);
router.delete('/:collectionId/cards/:id', authenticate, deleteCard);

export default router;
