import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import collectionRoutes from './routes/collection.routes';
import cardRoutes from './routes/card.routes';
import repoRoutes from './routes/repo.routes';

dotenv.config();

/**
 * Express application instance with CORS, JSON body parsing, and cookie parsing
 * configured. Mounts authentication, collection, and card route modules and exposes
 * a `/health` liveness endpoint.
 */
const app = express();
const PORT = process.env['PORT'] ?? 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env['FRONTEND_URL'] ?? 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/collections', cardRoutes);
app.use('/api/repo', repoRoutes);        // public — no auth middleware

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Bynder API listening on port ${PORT}`);
});

export default app;
