/**
 * Authentication routes — mounted at `/api/auth` in `server.ts`.
 *
 * | Method | Path        | Middleware    | Handler    |
 * |--------|-------------|---------------|------------|
 * | POST   | /register   | —             | register   |
 * | POST   | /login      | —             | login      |
 * | POST   | /logout     | —             | logout     |
 * | GET    | /me         | authenticate  | me         |
 */
import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
