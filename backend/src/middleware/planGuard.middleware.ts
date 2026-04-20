import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

/**
 * Hard limits enforced for users on the free subscription plan.
 * Used by {@link checkCollectionLimit} and {@link checkCardLimit} to gate creation requests.
 */
export const FREE_LIMITS = {
  /** Maximum number of collections a free-plan user may own. */
  collections: 1,
  /** Maximum number of cards allowed within a single collection for free-plan users. */
  cardsPerCollection: 50,
} as const;

/**
 * Express middleware that blocks access for non-Pro users.
 * Responds with HTTP 403 when `req.user.plan` is not `'pro'`.
 *
 * @param req - Express request; requires `req.user` to be set by `authenticate`.
 * @param res - Express response; responds with HTTP 403 if the user is not on the Pro plan.
 * @param next - Calls the next middleware when the user has a Pro subscription.
 * @returns A promise that resolves when the middleware has either called `next()` or sent a response.
 */
export async function requirePro(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.plan !== 'pro') {
    res.status(403).json({ error: 'Pro subscription required' });
    return;
  }
  next();
}

/**
 * Express middleware that enforces the free-plan collection creation limit.
 * Pro users bypass the check entirely. Free users are blocked with HTTP 403 when
 * they already own {@link FREE_LIMITS.collections} or more collections.
 *
 * @param req - Express request; requires `req.user` to be set by `authenticate`.
 * @param res - Express response; responds with HTTP 403 when the limit is reached.
 * @param next - Calls the next middleware when the user is allowed to create a collection.
 * @returns A promise that resolves when the middleware has either called `next()` or sent a response.
 */
export async function checkCollectionLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.plan === 'pro') {
    next();
    return;
  }

  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM collections WHERE user_id = $1',
    [req.user?.id]
  );

  const count = Number(rows[0]?.count ?? 0);

  if (count >= FREE_LIMITS.collections) {
    res.status(403).json({
      error: `Free plan is limited to ${FREE_LIMITS.collections} collection. Upgrade to Pro for unlimited collections.`,
    });
    return;
  }

  next();
}

/**
 * Express middleware that enforces the free-plan per-collection card limit.
 * Pro users bypass the check entirely. Free users are blocked with HTTP 403 when
 * the target collection already contains {@link FREE_LIMITS.cardsPerCollection} or more cards.
 *
 * @param req - Express request; requires `req.user` and `req.params.collectionId`.
 * @param res - Express response; responds with HTTP 403 when the limit is reached.
 * @param next - Calls the next middleware when the user is allowed to add a card.
 * @returns A promise that resolves when the middleware has either called `next()` or sent a response.
 */
export async function checkCardLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.plan === 'pro') {
    next();
    return;
  }

  const collectionId = Number(req.params['collectionId']);

  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM collected_cards WHERE collection_id = $1',
    [collectionId]
  );

  const count = Number(rows[0]?.count ?? 0);

  if (count >= FREE_LIMITS.cardsPerCollection) {
    res.status(403).json({
      error: `Free plan is limited to ${FREE_LIMITS.cardsPerCollection} cards per collection. Upgrade to Pro for unlimited cards.`,
    });
    return;
  }

  next();
}
