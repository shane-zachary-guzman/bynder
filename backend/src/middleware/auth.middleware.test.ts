import { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth.middleware';

jest.mock('../config/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('jsonwebtoken');

import pool from '../config/db';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReqResNext(overrides: Partial<Request> = {}): {
  req: Partial<Request>;
  res: Partial<Response> & { status: jest.Mock; json: jest.Mock };
  next: jest.Mock<NextFunction>;
} {
  const res = {
    json: jest.fn(),
    status: jest.fn(),
  } as Partial<Response> & { status: jest.Mock; json: jest.Mock };

  (res.status as jest.Mock).mockReturnValue(res);

  const req: Partial<Request> = {
    cookies: {},
    headers: {},
    ...overrides,
  };

  const next = jest.fn() as jest.Mock<NextFunction>;
  return { req, res, next };
}

const mockedQuery = jest.mocked(pool.query);
const mockedVerify = jest.mocked(jwt.verify);

const VALID_PAYLOAD = { userId: 42, email: 'user@test.com', iat: 1000, exp: 9999 };

beforeEach(() => {
  jest.clearAllMocks();
  process.env['JWT_SECRET'] = 'test-secret';
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `authenticate` middleware.
 * Covers token extraction from cookie and Authorization header, JWT verification,
 * plan resolution from the database, and error paths.
 */
describe('authenticate', () => {
  describe('when no token is present', () => {
    it('returns 401 when cookies and Authorization header are both absent', async () => {
      const { req, res, next } = mockReqResNext({ cookies: {}, headers: {} });

      await authenticate(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('when the token is invalid', () => {
    it('returns 401 when jwt.verify throws', async () => {
      mockedVerify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const { req, res, next } = mockReqResNext({ cookies: { bynder_token: 'bad.token' } });

      await authenticate(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });
  });

  describe('when the token is valid and a subscription row exists', () => {
    it('attaches req.user with the DB plan and calls next()', async () => {
      mockedVerify.mockReturnValue(VALID_PAYLOAD as never);
      mockedQuery.mockResolvedValueOnce({ rows: [{ plan: 'pro' }] } as never);

      const { req, res, next } = mockReqResNext({ cookies: { bynder_token: 'valid.token' } });

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect((req as Request).user).toEqual({
        id: 42,
        email: 'user@test.com',
        plan: 'pro',
      });
    });
  });

  describe('when the token is valid but no subscription row exists', () => {
    it("falls back to plan 'free' and calls next()", async () => {
      mockedVerify.mockReturnValue(VALID_PAYLOAD as never);
      mockedQuery.mockResolvedValueOnce({ rows: [] } as never);

      const { req, res, next } = mockReqResNext({ cookies: { bynder_token: 'valid.token' } });

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect((req as Request).user).toMatchObject({ plan: 'free' });
    });
  });

  describe('token source: cookie', () => {
    it('reads the token from the bynder_token cookie', async () => {
      mockedVerify.mockReturnValue(VALID_PAYLOAD as never);
      mockedQuery.mockResolvedValueOnce({ rows: [{ plan: 'free' }] } as never);

      const { req, res, next } = mockReqResNext({ cookies: { bynder_token: 'cookie.token' } });

      await authenticate(req as Request, res as Response, next);

      expect(mockedVerify).toHaveBeenCalledWith('cookie.token', 'test-secret');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('token source: Authorization header', () => {
    it('reads the token from the Authorization: Bearer header', async () => {
      mockedVerify.mockReturnValue(VALID_PAYLOAD as never);
      mockedQuery.mockResolvedValueOnce({ rows: [{ plan: 'free' }] } as never);

      const { req, res, next } = mockReqResNext({
        cookies: {},
        headers: { authorization: 'Bearer header.token' },
      });

      await authenticate(req as Request, res as Response, next);

      expect(mockedVerify).toHaveBeenCalledWith('header.token', 'test-secret');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
