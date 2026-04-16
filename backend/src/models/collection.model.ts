import pool from '../config/db';
import { Collection } from '../types/index';

/** Data-access methods for the `collections` table. */
export const CollectionModel = {
  /**
   * Retrieves all collections belonging to a user, ordered newest first.
   *
   * @param userId - The authenticated user's primary key.
   * @returns An array of {@link Collection} rows; empty if the user has no collections.
   */
  async findAllByUser(userId: number): Promise<Collection[]> {
    const { rows } = await pool.query<Collection>(
      'SELECT * FROM collections WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  /**
   * Fetches a single collection by id, scoped to the owning user.
   *
   * @param id - Primary key of the collection to fetch.
   * @param userId - Primary key of the user who must own the collection.
   * @returns The matching {@link Collection} row, or `null` if not found or not owned by `userId`.
   */
  async findById(id: number, userId: number): Promise<Collection | null> {
    const { rows } = await pool.query<Collection>(
      'SELECT * FROM collections WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  },

  /**
   * Inserts a new collection for the given user.
   *
   * @param userId - Primary key of the owning user.
   * @param name - Display name for the collection (1–255 characters).
   * @param description - Optional description of the collection.
   * @returns The newly inserted {@link Collection} row.
   * @throws If the database insert fails.
   */
  async create(userId: number, name: string, description?: string): Promise<Collection> {
    const { rows } = await pool.query<Collection>(
      `INSERT INTO collections (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name, description ?? null]
    );
    const collection = rows[0];
    if (!collection) throw new Error('Failed to create collection');
    return collection;
  },

  /**
   * Updates the name and description of an existing collection, scoped to the owning user.
   *
   * @param id - Primary key of the collection to update.
   * @param userId - Primary key of the user who must own the collection.
   * @param name - New display name for the collection.
   * @param description - New description; pass `undefined` to clear it.
   * @returns The updated {@link Collection} row, or `null` if the collection was not found.
   */
  async update(
    id: number,
    userId: number,
    name: string,
    description?: string
  ): Promise<Collection | null> {
    const { rows } = await pool.query<Collection>(
      `UPDATE collections
       SET name = $1, description = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [name, description ?? null, id, userId]
    );
    return rows[0] ?? null;
  },

  /**
   * Deletes a collection, scoped to the owning user.
   *
   * @param id - Primary key of the collection to delete.
   * @param userId - Primary key of the user who must own the collection.
   * @returns `true` if a row was deleted, `false` if the collection was not found.
   */
  async delete(id: number, userId: number): Promise<boolean> {
    const { rowCount } = await pool.query(
      'DELETE FROM collections WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  },
};
