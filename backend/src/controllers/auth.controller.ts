import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserModel } from '../models/user.model';
import { JwtPayload } from '../types/index';

const COOKIE_NAME = 'bynder_token';
const TOKEN_EXPIRY = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Signs a JWT containing the given payload, valid for {@link TOKEN_EXPIRY}.
 *
 * @param payload - The claims to embed in the token; see {@link JwtPayload}.
 * @returns A signed JWT string.
 * @throws If the `JWT_SECRET` environment variable is not set.
 */
function signToken(payload: JwtPayload): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Writes the JWT to an `httpOnly` cookie named `bynder_token`.
 * Sets `secure: true` in production so the cookie is only sent over HTTPS.
 *
 * @param res - The Express response on which the cookie is set.
 * @param token - The signed JWT string returned by {@link signToken}.
 */
function setTokenCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  });
}

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Handles `POST /api/auth/register`.
 * Validates the request body against {@link RegisterSchema}, creates a new user (with a free
 * subscription), signs a JWT, sets the auth cookie, and returns HTTP 201 with the token and
 * basic user fields.
 *
 * @param req - Express request; expects `{ email, password, name? }` in the body.
 * @param res - Express response; returns `{ token, user: { id, email, name } }` on success,
 *   HTTP 400 on validation failure, or HTTP 409 when the email is already registered.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await UserModel.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const user = await UserModel.create(email, password, name);
  const token = signToken({ userId: user.id, email: user.email });
  setTokenCookie(res, token);

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

/**
 * Handles `POST /api/auth/login`.
 * Validates the request body against {@link LoginSchema}, verifies the password, signs a JWT,
 * sets the auth cookie, and returns the token and basic user fields.
 *
 * @param req - Express request; expects `{ email, password }` in the body.
 * @param res - Express response; returns `{ token, user: { id, email, name } }` on success,
 *   HTTP 400 on validation failure, or HTTP 401 on invalid credentials.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findByEmail(email);

  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await UserModel.verifyPassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  setTokenCookie(res, token);

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}

/**
 * Handles `POST /api/auth/logout`.
 * Clears the `bynder_token` cookie and returns a confirmation message.
 *
 * @param _req - Express request (unused).
 * @param res - Express response; returns `{ message: 'Logged out successfully' }`.
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Logged out successfully' });
}

/**
 * Handles `GET /api/auth/me`.
 * Returns the profile of the currently authenticated user, including their active subscription plan.
 * Requires the `authenticate` middleware to have populated `req.user`.
 *
 * @param req - Express request; `req.user` must be set by the `authenticate` middleware.
 * @param res - Express response; returns `{ id, email, name, avatar_url, plan }` on success
 *   or HTTP 404 if the user record no longer exists.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const user = await UserModel.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    plan: req.user!.plan,
  });
}
