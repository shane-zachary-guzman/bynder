import { Request, Response } from 'express';
import { getCards, getCard, createCard, updateCard, deleteCard } from './card.controller';

jest.mock('../models/card.model');
jest.mock('../models/collection.model');

import { CardModel, EnrichedCollectedCard } from '../models/card.model';
import { CollectionModel } from '../models/collection.model';
import { Collection, CollectedCard } from '../types/index';

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

const mockedCard = jest.mocked(CardModel);
const mockedCollection = jest.mocked(CollectionModel);

const SAMPLE_COLLECTION: Collection = {
  id: 10,
  user_id: 1,
  name: 'My Collection',
  description: null,
  created_at: new Date(),
};

const SAMPLE_CARD: EnrichedCollectedCard = {
  id: 5,
  collection_id: 10,
  game: 'lorcana',
  repo_card_id: 42,
  condition: 'mint',
  treatment: 'normal',
  quantity: 1,
  estimated_value: null,
  notes: null,
  created_at: new Date(),
  // Enriched repo fields
  name: 'Elsa, Spirit of Winter',
  image_url: 'https://example.com/elsa.png',
  set_code: 'TFC',
  card_number: '001/204',
  set_name: 'The First Chapter',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: collection ownership check passes
  mockedCollection.findById.mockResolvedValue(SAMPLE_COLLECTION);
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `getCards` controller.
 * Verifies collection ownership before returning cards.
 */
describe('getCards', () => {
  it('returns the cards array when the collection is found', async () => {
    mockedCard.findAllByCollection.mockResolvedValueOnce([SAMPLE_CARD]);

    const { req, res } = mockReqRes({ collectionId: '10' });

    await getCards(req as Request, res as Response);

    expect(mockedCard.findAllByCollection).toHaveBeenCalledWith(10);
    expect(res.json).toHaveBeenCalledWith([SAMPLE_CARD]);
  });

  it('returns 404 when the collection is not found', async () => {
    mockedCollection.findById.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ collectionId: '99' });

    await getCards(req as Request, res as Response);

    expect(mockedCard.findAllByCollection).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Collection not found' });
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `getCard` controller.
 * Verifies collection ownership and card existence.
 */
describe('getCard', () => {
  it('returns 404 when the collection is not found', async () => {
    mockedCollection.findById.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ collectionId: '99', id: '5' });

    await getCard(req as Request, res as Response);

    expect(mockedCard.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Collection not found' });
  });

  it('returns 404 when the card is not found', async () => {
    mockedCard.findById.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ collectionId: '10', id: '999' });

    await getCard(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found' });
  });

  it('returns the card when found', async () => {
    mockedCard.findById.mockResolvedValueOnce(SAMPLE_CARD);

    const { req, res } = mockReqRes({ collectionId: '10', id: '5' });

    await getCard(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(SAMPLE_CARD);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `createCard` controller.
 * Validates enum fields and required fields before inserting.
 */
describe('createCard', () => {
  it('returns 400 when condition is not a valid enum value', async () => {
    const { req, res } = mockReqRes(
      { collectionId: '10' },
      { repo_card_id: 1, condition: 'perfect', treatment: 'normal' }
    );

    await createCard(req as Request, res as Response);

    expect(mockedCard.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when treatment is not a valid enum value', async () => {
    const { req, res } = mockReqRes(
      { collectionId: '10' },
      { repo_card_id: 1, condition: 'mint', treatment: 'rainbow' }
    );

    await createCard(req as Request, res as Response);

    expect(mockedCard.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when repo_card_id is missing', async () => {
    const { req, res } = mockReqRes(
      { collectionId: '10' },
      { condition: 'mint', treatment: 'normal' }
    );

    await createCard(req as Request, res as Response);

    expect(mockedCard.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with the created card on valid input', async () => {
    mockedCard.create.mockResolvedValueOnce(SAMPLE_CARD);

    const { req, res } = mockReqRes(
      { collectionId: '10' },
      { repo_card_id: 42, condition: 'mint', treatment: 'normal', quantity: 1 }
    );

    await createCard(req as Request, res as Response);

    expect(mockedCard.create).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ repo_card_id: 42, condition: 'mint', treatment: 'normal' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(SAMPLE_CARD);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `updateCard` controller.
 * Verifies collection and card existence before applying updates.
 */
describe('updateCard', () => {
  it('returns 404 when the collection is not found', async () => {
    mockedCollection.findById.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ collectionId: '99', id: '5' }, { condition: 'mint' });

    await updateCard(req as Request, res as Response);

    expect(mockedCard.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Collection not found' });
  });

  it('returns 404 when the card is not found', async () => {
    mockedCard.update.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ collectionId: '10', id: '999' }, { condition: 'mint' });

    await updateCard(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found' });
  });

  it('returns the updated card on success', async () => {
    const updated: CollectedCard = { ...SAMPLE_CARD, condition: 'near_mint' };
    mockedCard.update.mockResolvedValueOnce(updated);

    const { req, res } = mockReqRes(
      { collectionId: '10', id: '5' },
      { condition: 'near_mint' }
    );

    await updateCard(req as Request, res as Response);

    expect(mockedCard.update).toHaveBeenCalledWith(
      5,
      10,
      expect.objectContaining({ condition: 'near_mint' })
    );
    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

// ---------------------------------------------------------------------------

/**
 * Tests for the `deleteCard` controller.
 * Verifies collection and card existence before deleting.
 */
describe('deleteCard', () => {
  it('returns 404 when the collection is not found', async () => {
    mockedCollection.findById.mockResolvedValueOnce(null);

    const { req, res } = mockReqRes({ collectionId: '99', id: '5' });

    await deleteCard(req as Request, res as Response);

    expect(mockedCard.delete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Collection not found' });
  });

  it('returns 404 when the card is not found', async () => {
    mockedCard.delete.mockResolvedValueOnce(false);

    const { req, res } = mockReqRes({ collectionId: '10', id: '999' });

    await deleteCard(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found' });
  });

  it('returns 204 on success', async () => {
    mockedCard.delete.mockResolvedValueOnce(true);

    const { req, res } = mockReqRes({ collectionId: '10', id: '5' });

    await deleteCard(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
