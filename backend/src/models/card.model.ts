import pool from '../config/db';
import { CollectedCard, CardCondition, CardTreatment } from '../types/index';

/** Fields required when adding a new card to a collection. */
export interface CreateCardInput {
  /** Primary key of the card in the Lorcana card repository. */
  repo_card_id: number;
  condition: CardCondition;
  treatment: CardTreatment;
  quantity: number;
  /** Decimal value as a string; optional at creation time. */
  estimated_value?: string;
  notes?: string;
}

/** Fields that may be updated on an existing collected card; all are optional. */
export interface UpdateCardInput {
  condition?: CardCondition;
  treatment?: CardTreatment;
  quantity?: number;
  /** Pass `null` to explicitly clear the stored value. */
  estimated_value?: string | null;
  /** Pass `null` to explicitly clear the stored notes. */
  notes?: string | null;
}

/** Data-access methods for the `collected_cards` table. */
export const CardModel = {
  /**
   * Retrieves all cards in a collection, ordered newest first.
   *
   * @param collectionId - Primary key of the parent collection.
   * @returns An array of {@link CollectedCard} rows; empty if the collection has no cards.
   */
  async findAllByCollection(collectionId: number): Promise<CollectedCard[]> {
    const { rows } = await pool.query<CollectedCard>(
      'SELECT * FROM collected_cards WHERE collection_id = $1 ORDER BY created_at DESC',
      [collectionId]
    );
    return rows;
  },

  /**
   * Fetches a single collected card by id, scoped to its parent collection.
   *
   * @param id - Primary key of the collected card.
   * @param collectionId - Primary key of the collection the card must belong to.
   * @returns The matching {@link CollectedCard} row, or `null` if not found.
   */
  async findById(id: number, collectionId: number): Promise<CollectedCard | null> {
    const { rows } = await pool.query<CollectedCard>(
      'SELECT * FROM collected_cards WHERE id = $1 AND collection_id = $2',
      [id, collectionId]
    );
    return rows[0] ?? null;
  },

  /**
   * Inserts a new collected card into the specified collection.
   * The `game` column is always set to `'lorcana'`.
   *
   * @param collectionId - Primary key of the parent collection.
   * @param input - Card fields; see {@link CreateCardInput}.
   * @returns The newly inserted {@link CollectedCard} row.
   * @throws If the database insert fails.
   */
  async create(collectionId: number, input: CreateCardInput): Promise<CollectedCard> {
    const { rows } = await pool.query<CollectedCard>(
      `INSERT INTO collected_cards
         (collection_id, game, repo_card_id, condition, treatment, quantity, estimated_value, notes)
       VALUES ($1, 'lorcana', $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        collectionId,
        input.repo_card_id,
        input.condition,
        input.treatment,
        input.quantity,
        input.estimated_value ?? null,
        input.notes ?? null,
      ]
    );
    const card = rows[0];
    if (!card) throw new Error('Failed to create collected card');
    return card;
  },

  /**
   * Updates mutable fields on an existing collected card using `COALESCE` for optional fields.
   * `estimated_value` and `notes` are always overwritten (pass `null` to clear them).
   *
   * @param id - Primary key of the collected card to update.
   * @param collectionId - Primary key of the collection the card must belong to.
   * @param input - Partial set of fields to update; see {@link UpdateCardInput}.
   * @returns The updated {@link CollectedCard} row, or `null` if the card was not found.
   */
  async update(
    id: number,
    collectionId: number,
    input: UpdateCardInput
  ): Promise<CollectedCard | null> {
    const { rows } = await pool.query<CollectedCard>(
      `UPDATE collected_cards
       SET condition       = COALESCE($1, condition),
           treatment       = COALESCE($2, treatment),
           quantity        = COALESCE($3, quantity),
           estimated_value = $4,
           notes           = $5
       WHERE id = $6 AND collection_id = $7
       RETURNING *`,
      [
        input.condition ?? null,
        input.treatment ?? null,
        input.quantity ?? null,
        input.estimated_value ?? null,
        input.notes ?? null,
        id,
        collectionId,
      ]
    );
    return rows[0] ?? null;
  },

  /**
   * Deletes a collected card, scoped to its parent collection.
   *
   * @param id - Primary key of the collected card to delete.
   * @param collectionId - Primary key of the collection the card must belong to.
   * @returns `true` if a row was deleted, `false` if the card was not found.
   */
  async delete(id: number, collectionId: number): Promise<boolean> {
    const { rowCount } = await pool.query(
      'DELETE FROM collected_cards WHERE id = $1 AND collection_id = $2',
      [id, collectionId]
    );
    return (rowCount ?? 0) > 0;
  },
};
