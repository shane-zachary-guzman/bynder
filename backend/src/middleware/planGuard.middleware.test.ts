import { Request, Response, NextFunction } from 'express';
import { requirePro, checkCollectionLimit, checkCardLimit, FREE_LIMITS } from './planGuard.middleware';

jest.mock('../config/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import pool from '../config/db';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function mockReqResNext(overrides: Partial<Request> = {}): {
  req: Partial<Request>;
  res: Partial<Response> & { status: jest.Mock; json: jest.Mock; send: jest.Mock };
  next: jest.Mock<NextFunction>;
} {
  const res = {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn(),
  } as Partial<Response> & { status: jest.Mock; json: jest.Mock; send: jest.Mock };

  // Make status chainable
  (res.status as jest.Mock).mockReturnValue(res);

  const req: Partial<Request> = { ...overrides };
  const next = jest.fn() as jest.Mock<NextFunction>;

  return { req, res, next };
}

const mockedQuery = jest.mocked(pool.query);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `requirePro` middleware.
 * Verifies that only users with plan === 'pro' are allowed through.
 */
describe('requirePro', () => {
  it('calls next() for a pro user', async () => {
    const { req, res, next } = mockReqResNext({ user: { id: 1, email: 'a@b.com', plan: 'pro' } });

    await requirePro(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 for a free user', async () => {
    const { req, res, next } = mockReqResNext({ user: { id: 1, email: 'a@b.com', plan: 'free' } });

    await requirePro(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Pro subscription required' });
  });

  it('returns 403 when req.user is undefined', async () => {
    const { req, res, next } = mockReqResNext();

    await requirePro(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `checkCollectionLimit` middleware.
 * Pro users bypass the DB check; free users are gated by FREE_LIMITS.collections.
 */
describe('checkCollectionLimit', () => {
  it('calls next() immediately for a pro user without querying the DB', async () => {
    const { req, res, next } = mockReqResNext({ user: { id: 1, email: 'a@b.com', plan: 'pro' } });

    await checkCollectionLimit(req as Request, res as Response, next);

    expect(mockedQuery).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() when a free user is under the collection limit', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] } as never);

    const { req, res, next } = mockReqResNext({ user: { id: 2, email: 'b@b.com', plan: 'free' } });

    await checkCollectionLimit(req as Request, res as Response, next);

    expect(mockedQuery).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when a free user is at the collection limit', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ count: String(FREE_LIMITS.collections) }],
    } as never);

    const { req, res, next } = mockReqResNext({ user: { id: 2, email: 'b@b.com', plan: 'free' } });

    await checkCollectionLimit(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Free plan') })
    );
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `checkCardLimit` middleware.
 * Pro users bypass the DB check; free users are gated by FREE_LIMITS.cardsPerCollection.
 */
describe('checkCardLimit', () => {
  it('calls next() immediately for a pro user without querying the DB', async () => {
    const { req, res, next } = mockReqResNext({
      user: { id: 1, email: 'a@b.com', plan: 'pro' },
      params: { collectionId: '10' },
    });

    await checkCardLimit(req as Request, res as Response, next);

    expect(mockedQuery).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() when a free user is under the card limit', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as never);

    const { req, res, next } = mockReqResNext({
      user: { id: 2, email: 'b@b.com', plan: 'free' },
      params: { collectionId: '10' },
    });

    await checkCardLimit(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when a free user is at the card limit', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ count: String(FREE_LIMITS.cardsPerCollection) }],
    } as never);

    const { req, res, next } = mockReqResNext({
      user: { id: 2, email: 'b@b.com', plan: 'free' },
      params: { collectionId: '10' },
    });

    await checkCardLimit(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Free plan') })
    );
  });
});
