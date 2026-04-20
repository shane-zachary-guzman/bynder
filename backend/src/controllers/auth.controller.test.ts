import { Request, Response } from 'express';
import { register, login, logout, me } from './auth.controller';

jest.mock('../models/user.model');
jest.mock('jsonwebtoken');

import { UserModel } from '../models/user.model';
import jwt from 'jsonwebtoken';
import { User } from '../types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReqRes(body: Record<string, unknown> = {}, userOverride?: { id: number; email: string; plan: 'free' | 'pro' }): {
  req: Partial<Request>;
  res: Partial<Response> & {
    status: jest.Mock;
    json: jest.Mock;
    cookie: jest.Mock;
    clearCookie: jest.Mock;
    send: jest.Mock;
  };
} {
  const res = {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as Partial<Response> & {
    status: jest.Mock;
    json: jest.Mock;
    cookie: jest.Mock;
    clearCookie: jest.Mock;
    send: jest.Mock;
  };

  (res.status as jest.Mock).mockReturnValue(res);
  (res.cookie as jest.Mock).mockReturnValue(res);

  const req: Partial<Request> = { body, user: userOverride as Request['user'] };
  return { req, res };
}

const mockedUserModel = jest.mocked(UserModel);
const mockedJwt = jest.mocked(jwt);

const BASE_USER: User = {
  id: 1,
  email: 'test@example.com',
  password_hash: 'hashed',
  google_id: null,
  name: 'Test User',
  avatar_url: null,
  created_at: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env['JWT_SECRET'] = 'test-secret';
  // jwt.sign returns a predictable token by default
  mockedJwt.sign.mockReturnValue('signed.token' as never);
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `register` controller.
 * Validates input, guards against duplicate emails, and creates users.
 */
describe('register', () => {
  it('returns 400 when the email is invalid', async () => {
    const { req, res } = mockReqRes({ email: 'not-an-email', password: 'password123' });

    await register(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.anything() }));
  });

  it('returns 400 when the password is shorter than 8 characters', async () => {
    const { req, res } = mockReqRes({ email: 'a@b.com', password: 'short' });

    await register(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 409 when the email is already registered', async () => {
    mockedUserModel.findByEmail.mockResolvedValueOnce(BASE_USER);

    const { req, res } = mockReqRes({ email: 'test@example.com', password: 'password123' });

    await register(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already in use' });
  });

  it('returns 201 with token and user when input is valid and user is new', async () => {
    mockedUserModel.findByEmail.mockResolvedValueOnce(null);
    mockedUserModel.create.mockResolvedValueOnce(BASE_USER);

    const { req, res } = mockReqRes({
      email: 'new@example.com',
      password: 'securepassword',
      name: 'New User',
    });

    await register(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'signed.token',
        user: { id: BASE_USER.id, email: BASE_USER.email, name: BASE_USER.name },
      })
    );
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `login` controller.
 * Validates input, verifies credentials, and returns a token on success.
 */
describe('login', () => {
  it('returns 400 for an invalid request body (missing email)', async () => {
    const { req, res } = mockReqRes({ password: 'password123' });

    await login(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when the user is not found', async () => {
    mockedUserModel.findByEmail.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ email: 'ghost@example.com', password: 'password123' });

    await login(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('returns 401 when the password does not match', async () => {
    mockedUserModel.findByEmail.mockResolvedValueOnce(BASE_USER);
    mockedUserModel.verifyPassword.mockResolvedValueOnce(false);

    const { req, res } = mockReqRes({ email: 'test@example.com', password: 'wrongpassword' });

    await login(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('returns 200 with token and user on valid credentials', async () => {
    mockedUserModel.findByEmail.mockResolvedValueOnce(BASE_USER);
    mockedUserModel.verifyPassword.mockResolvedValueOnce(true);

    const { req, res } = mockReqRes({ email: 'test@example.com', password: 'correctpassword' });

    await login(req as Request, res as Response);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'signed.token',
        user: { id: BASE_USER.id, email: BASE_USER.email, name: BASE_USER.name },
      })
    );
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `logout` controller.
 * Verifies that the auth cookie is cleared.
 */
describe('logout', () => {
  it('clears the bynder_token cookie and returns a success message', async () => {
    const { req, res } = mockReqRes();

    await logout(req as Request, res as Response);

    expect(res.clearCookie).toHaveBeenCalledWith('bynder_token');
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `me` controller.
 * Returns user profile data for authenticated requests.
 */
describe('me', () => {
  it('returns 404 when UserModel.findById returns null', async () => {
    mockedUserModel.findById.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({}, { id: 99, email: 'ghost@example.com', plan: 'free' });

    await me(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns user data with plan when the user exists', async () => {
    mockedUserModel.findById.mockResolvedValueOnce(BASE_USER);

    const { req, res } = mockReqRes({}, { id: 1, email: 'test@example.com', plan: 'pro' });

    await me(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      id: BASE_USER.id,
      email: BASE_USER.email,
      name: BASE_USER.name,
      avatar_url: BASE_USER.avatar_url,
      plan: 'pro',
    });
  });
});
