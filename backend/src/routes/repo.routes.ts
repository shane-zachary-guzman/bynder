/**
 * @file repo.routes.ts
 * @description Public read-only routes for seeded card repositories.
 * No authentication middleware is applied — these endpoints are intentionally
 * accessible to unauthenticated visitors (e.g. the splash gallery page).
 *
 * Mounted at: /api/repo
 *
 * | Method | Path      | Handler          |
 * |--------|-----------|------------------|
 * | GET    | /lorcana  | getLorcanaCards  |
 */

import { Router } from 'express';
import { getLorcanaCards } from '../controllers/repo.controller';

const router = Router();

router.get('/lorcana', getLorcanaCards);

// Future repos:
// router.get('/mtg',     getMtgCards);
// router.get('/pokemon', getPokemonCards);

export default router;
