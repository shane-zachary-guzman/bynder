// ─── Domain types ─────────────────────────────────────────────────────────────

/** Represents a registered user account stored in the `users` table. */
export interface User {
  id: number;
  email: string;
  /** Bcrypt hash of the user's password; `null` for OAuth-only accounts. */
  password_hash: string | null;
  /** Google OAuth subject identifier; `null` for email/password accounts. */
  google_id: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
}

/** Represents a billing subscription row linked to a user in the `subscriptions` table. */
export interface Subscription {
  id: number;
  user_id: number;
  plan: 'free' | 'pro';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: Date | null;
  created_at: Date;
}

/** Represents a named card collection owned by a user. */
export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

/** Represents a single Lorcana card entry from the card repository. */
export interface LorcanaCard {
  id: number;
  set_code: string;
  set_name: string;
  card_number: string;
  name: string;
  ink_color: string | null;
  card_type: string | null;
  rarity: string | null;
  lore_value: number | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
}

/** Represents a physical card instance tracked inside a user's collection. */
export interface CollectedCard {
  id: number;
  collection_id: number;
  game: string;
  repo_card_id: number;
  condition: CardCondition;
  treatment: CardTreatment;
  quantity: number;
  /** Monetary value as a decimal string; pg returns DECIMAL columns as strings. */
  estimated_value: string | null;
  notes: string | null;
  created_at: Date;
}

/** Physical condition of a collected card, ordered from best to worst. */
export type CardCondition =
  | 'mint'
  | 'near_mint'
  | 'lightly_played'
  | 'moderately_played'
  | 'heavily_played'
  | 'damaged';

/** Print treatment or finish applied to a collected card. */
export type CardTreatment =
  | 'normal'
  | 'foil'
  | 'serialized'
  | 'enchanted'
  | 'promo';

// ─── JWT ──────────────────────────────────────────────────────────────────────

/** Claims embedded in the signed JWT issued on login/register. */
export interface JwtPayload {
  userId: number;
  email: string;
}

// ─── Express augmentation ─────────────────────────────────────────────────────

/**
 * Minimal user representation attached to `req.user` by the `authenticate` middleware.
 * Includes the resolved subscription plan so controllers do not need an extra DB call.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  plan: 'free' | 'pro';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
