import { Request, Response } from 'express';
import { z } from 'zod';
import { CollectionModel } from '../models/collection.model';

const CollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

/**
 * Handles `GET /api/collections`.
 * Returns all collections owned by the authenticated user, ordered newest first.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.user` must be set by the `authenticate` middleware.
 * @param res - Express response; returns a JSON array of {@link Collection} objects.
 */
export async function getCollections(req: Request, res: Response): Promise<void> {
  const collections = await CollectionModel.findAllByUser(req.user!.id);
  res.json(collections);
}

/**
 * Handles `GET /api/collections/:id`.
 * Returns a single collection by id, scoped to the authenticated user.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.params.id` is the collection primary key.
 * @param res - Express response; returns the {@link Collection} object or HTTP 404 if not found.
 */
export async function getCollection(req: Request, res: Response): Promise<void> {
  const id = Number(req.params['id']);
  const collection = await CollectionModel.findById(id, req.user!.id);
  if (!collection) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }
  res.json(collection);
}

/**
 * Handles `POST /api/collections`.
 * Validates the request body against {@link CollectionSchema} and creates a new collection.
 * Requires the `authenticate` and `checkCollectionLimit` middleware.
 *
 * @param req - Express request; expects `{ name, description? }` in the body.
 * @param res - Express response; returns the created {@link Collection} with HTTP 201 on success,
 *   or HTTP 400 on validation failure.
 */
export async function createCollection(req: Request, res: Response): Promise<void> {
  const parsed = CollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const collection = await CollectionModel.create(
    req.user!.id,
    parsed.data.name,
    parsed.data.description
  );
  res.status(201).json(collection);
}

/**
 * Handles `PUT /api/collections/:id`.
 * Validates the request body against {@link CollectionSchema} and updates the collection.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.params.id` is the collection primary key;
 *   expects `{ name, description? }` in the body.
 * @param res - Express response; returns the updated {@link Collection} on success,
 *   HTTP 400 on validation failure, or HTTP 404 if not found.
 */
export async function updateCollection(req: Request, res: Response): Promise<void> {
  const id = Number(req.params['id']);
  const parsed = CollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const collection = await CollectionModel.update(
    id,
    req.user!.id,
    parsed.data.name,
    parsed.data.description
  );
  if (!collection) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }
  res.json(collection);
}

/**
 * Handles `DELETE /api/collections/:id`.
 * Deletes the collection with the given id, scoped to the authenticated user.
 * Requires the `authenticate` middleware.
 *
 * @param req - Express request; `req.params.id` is the collection primary key.
 * @param res - Express response; returns HTTP 204 on success or HTTP 404 if not found.
 */
export async function deleteCollection(req: Request, res: Response): Promise<void> {
  const id = Number(req.params['id']);
  const deleted = await CollectionModel.delete(id, req.user!.id);
  if (!deleted) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }
  res.status(204).send();
}
