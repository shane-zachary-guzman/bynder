import { Request, Response } from 'express';
import pool from '../config/db';
import { LorcanaCard } from '../types/index';

/**
 * Returns all rows from `lorcana_repo` ordered by set code then card number.
 * This endpoint is intentionally public — no authentication required.
 *
 * @route  GET /api/repo/lorcana
 * @returns 200 with an array of {@link LorcanaCard} objects.
 */
export async function getLorcanaCards(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const { rows } = await pool.query<LorcanaCard>(
      `SELECT *
       FROM   lorcana_repo
       ORDER  BY set_code, LPAD(card_number, 6, '0')`
    );
    res.json(rows);
  } catch (err) {
    console.error('getLorcanaCards error:', err);
    res.status(500).json({ message: 'Failed to load Lorcana cards.' });
  }
}
