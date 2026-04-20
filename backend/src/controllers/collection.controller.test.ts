import { Request, Response } from 'express';
import {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
} from './collection.controller';

jest.mock('../models/collection.model');

import { CollectionModel } from '../models/collection.model';
import { Collection } from '../types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReqRes(
  params: Record<string, string> = {},
  body: Record<string, unknown> = {},
  userId = 1
): {
  req: Partial<Request>;
  res: Partial<Response> & { status: jest.Mock; json: jest.Mock; send: jest.Mock };
} {
  const res = {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn(),
  } as Partial<Response> & { status: jest.Mock; json: jest.Mock; send: jest.Mock };

  (res.status as jest.Mock).mockReturnValue(res);

  const req: Partial<Request> = {
    body,
    params,
    user: { id: userId, email: 'user@test.com', plan: 'free' },
  };

  return { req, res };
}

const mockedCollection = jest.mocked(CollectionModel);

const SAMPLE_COLLECTION: Collection = {
  id: 10,
  user_id: 1,
  name: 'My Collection',
  description: 'A description',
  created_at: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `getCollections` controller.
 * Returns the full array of collections owned by the current user.
 */
describe('getCollections', () => {
  it('returns the array from CollectionModel.findAllByUser', async () => {
    mockedCollection.findAllByUser.mockResolvedValueOnce([SAMPLE_COLLECTION]);

    const { req, res } = mockReqRes();

    await getCollections(req as Request, res as Response);

    expect(mockedCollection.findAllByUser).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith([SAMPLE_COLLECTION]);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `getCollection` controller.
 * Returns a single collection or 404 when not found.
 */
describe('getCollection', () => {
  it('returns 404 when CollectionModel.findById returns null', async () => {
    mockedCollection.findById.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ id: '10' });

    await getCollection(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Collection not found' });
  });

  it('returns the collection when found', async () => {
    mockedCollection.findById.mockResolvedValueOnce(SAMPLE_COLLECTION);

    const { req, res } = mockReqRes({ id: '10' });

    await getCollection(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(SAMPLE_COLLECTION);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `createCollection` controller.
 * Validates input and creates the collection on success.
 */
describe('createCollection', () => {
  it('returns 400 when name is missing', async () => {
    const { req, res } = mockReqRes({}, { description: 'no name here' });

    await createCollection(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedCollection.create).not.toHaveBeenCalled();
  });

  it('returns 400 when name is an empty string', async () => {
    const { req, res } = mockReqRes({}, { name: '' });

    await createCollection(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with the created collection on valid input', async () => {
    mockedCollection.create.mockResolvedValueOnce(SAMPLE_COLLECTION);

    const { req, res } = mockReqRes({}, { name: 'My Collection', description: 'desc' });

    await createCollection(req as Request, res as Response);

    expect(mockedCollection.create).toHaveBeenCalledWith(1, 'My Collection', 'desc');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(SAMPLE_COLLECTION);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `updateCollection` controller.
 * Validates input, handles missing collections, and returns updated data.
 */
describe('updateCollection', () => {
  it('returns 400 for an invalid body (name too short / missing)', async () => {
    const { req, res } = mockReqRes({ id: '10' }, {});

    await updateCollection(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedCollection.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the model returns null', async () => {
    mockedCollection.update.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ id: '10' }, { name: 'Updated Name' });

    await updateCollection(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Collection not found' });
  });

  it('returns the updated collection on success', async () => {
    const updated: Collection = { ...SAMPLE_COLLECTION, name: 'Updated Name' };
    mockedCollection.update.mockResolvedValueOnce(updated);

    const { req, res } = mockReqRes({ id: '10' }, { name: 'Updated Name' });

    await updateCollection(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `deleteCollection` controller.
 * Returns 204 on success, 404 when the collection does not exist.
 */
describe('deleteCollection', () => {
  it('returns 404 when the model returns false', async () => {
    mockedCollection.delete.mockResolvedValueOnce(false);

    const { req, res } = mockReqRes({ id: '99' });

    await deleteCollection(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Collection not found' });
  });

  it('returns 204 on success', async () => {
    mockedCollection.delete.mockResolvedValueOnce(true);

    const { req, res } = mockReqRes({ id: '10' });

    await deleteCollection(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
