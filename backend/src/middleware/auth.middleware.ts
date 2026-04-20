import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index';
import pool from '../config/db';

/**
 * Express middleware that authenticates incoming requests via JWT.
 *
 * Reads the token from the `bynder_token` cookie or the `Authorization: Bearer <token>` header,
 * verifies it against `JWT_SECRET`, then fetches the user's current subscription plan from the
 * database and attaches an {@link AuthenticatedUser} object to `req.user`.
 * Fetching the plan on every request ensures plan changes take effect immediately without
 * requiring the user to log out.
 *
 * @param req - Express request; `req.user` is populated on success.
 * @param res - Express response; responds with HTTP 401 if no token is present or it is invalid.
 * @param next - Calls the next middleware when authentication succeeds.
 * @returns A promise that resolves when the middleware has either called `next()` or sent a response.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token: string | undefined =
    req.cookies['bynder_token'] ??
    req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const secret = process.env['JWT_SECRET'];
    if (!secret) throw new Error('JWT_SECRET is not set');

    const payload = jwt.verify(token, secret) as JwtPayload;

    // Fetch current plan on every request so plan changes take effect immediately
    const { rows } = await pool.query<{ plan: string }>(
      'SELECT plan FROM subscriptions WHERE user_id = $1',
      [payload.userId]
    );

    const row = rows[0] ?? null;

    req.user = {
      id: payload.userId,
      email: payload.email,
      plan: (row?.plan ?? 'free') as 'free' | 'pro',
    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
