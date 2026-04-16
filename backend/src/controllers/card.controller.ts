import { Request, Response } from 'express';
import { z } from 'zod';
import { CardModel } from '../models/card.model';
import { CollectionModel } from '../models/collection.model';
import { CardCondition, CardTreatment } from '../types/index';

const CONDITIONS: [CardCondition, ...CardCondition[]] = [
  'mint',
  'near_mint',
  'lightly_played',
  'moderately_played',
  'heavily_played',
  'damaged',
];

const TREATMENTS: [CardTreatment, ...CardTreatment[]] = [
  'normal',
  'foil',
  'serialized',
  'enchanted',
  'promo',
];

const CreateCardSchema = z.object({
  repo_card_id: z.number().int().positive(),
  condition: z.enum(CONDITIONS),
  treatment: z.enum(TREATMENTS).default('normal'),
  quantity: z.number().int().positive().default(1),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateCardSchema = z.object({
  condition: z.enum(CONDITIONS).optional(),
  treatment: z.enum(TREATMENTS).optional(),
  quantity: z.number().int().positive().optional(),
  estimated_value: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * Confirms that a collection exists and is owned by the given user.
 * Sends HTTP 404 and returns `false` if the collection cannot be found, allowing
 * callers to short-circuit handler logic with a single `if` check.
 *
 * @param collectionId - Primary key of the collection to verify.
 * @param userId - Primary key of the user who must own the collection.
 * @param res - Express response used to send the 404 error when ownership fails.
 * @returns `true` if the collection exists and belongs to `userId`, `false` otherwise.
 */
async function verifyCollectionOwnership(
  collectionId: number,
  userId: number,
  res: Response
): Promise<boolean> {
  const collection = await CollectionModel.findById(collectionId, userId);
  if (!collection) {
    res.status(404).json({ error: 'Collection not found' });
    return false;
  }
  return true;
}

/**
 * Handles `GET /api/collections/:collectionId/cards`.
 * Returns all cards in the specified collection after verifying ownership.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.params.collectionId` is the collection primary key.
 * @param res - Express response; returns a JSON array of {@link CollectedCard} objects,
 *   or HTTP 404 if the collection does not exist or is not owned by the authenticated user.
 */
export async function getCards(req: Request, res: Response): Promise<void> {
  const collectionId = Number(req.params['collectionId']);
  if (!(await verifyCollectionOwnership(collectionId, req.user!.id, res))) return;
  const cards = await CardModel.findAllByCollection(collectionId);
  res.json(cards);
}

/**
 * Handles `GET /api/collections/:collectionId/cards/:id`.
 * Returns a single card by id after verifying collection ownership.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.params.collectionId` and `req.params.id` identify the card.
 * @param res - Express response; returns the {@link CollectedCard} object,
 *   HTTP 404 if the collection is not found, or HTTP 404 if the card is not found.
 */
export async function getCard(req: Request, res: Response): Promise<void> {
  const collectionId = Number(req.params['collectionId']);
  const id = Number(req.params['id']);
  if (!(await verifyCollectionOwnership(collectionId, req.user!.id, res))) return;
  const card = await CardModel.findById(id, collectionId);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.json(card);
}

/**
 * Handles `POST /api/collections/:collectionId/cards`.
 * Validates the request body against {@link CreateCardSchema} and adds a new card to the collection.
 * Requires the `authenticate` and `checkCardLimit` middleware.
 *
 * @param req - Express request; `req.params.collectionId` identifies the collection;
 *   expects a body matching {@link CreateCardSchema}.
 * @param res - Express response; returns the created {@link CollectedCard} with HTTP 201 on success,
 *   HTTP 400 on validation failure, or HTTP 404 if the collection is not found.
 */
export async function createCard(req: Request, res: Response): Promise<void> {
  const collectionId = Number(req.params['collectionId']);
  if (!(await verifyCollectionOwnership(collectionId, req.user!.id, res))) return;
  const parsed = CreateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const card = await CardModel.create(collectionId, parsed.data);
  res.status(201).json(card);
}

/**
 * Handles `PUT /api/collections/:collectionId/cards/:id`.
 * Validates the request body against {@link UpdateCardSchema} and applies partial updates to the card.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.params.collectionId` and `req.params.id` identify the card;
 *   expects a body matching {@link UpdateCardSchema}.
 * @param res - Express response; returns the updated {@link CollectedCard} on success,
 *   HTTP 400 on validation failure, or HTTP 404 if the collection or card is not found.
 */
export async function updateCard(req: Request, res: Response): Promise<void> {
  const collectionId = Number(req.params['collectionId']);
  const id = Number(req.params['id']);
  if (!(await verifyCollectionOwnership(collectionId, req.user!.id, res))) return;
  const parsed = UpdateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const card = await CardModel.update(id, collectionId, parsed.data);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.json(card);
}

/**
 * Handles `DELETE /api/collections/:collectionId/cards/:id`.
 * Deletes the specified card after verifying collection ownership.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.params.collectionId` and `req.params.id` identify the card.
 * @param res - Express response; returns HTTP 204 on success,
 *   or HTTP 404 if the collection or card is not found.
 */
export async function deleteCard(req: Request, res: Response): Promise<void> {
  const collectionId = Number(req.params['collectionId']);
  const id = Number(req.params['id']);
  if (!(await verifyCollectionOwnership(collectionId, req.user!.id, res))) return;
  const deleted = await CardModel.delete(id, collectionId);
  if (!deleted) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.status(204).send();
}
