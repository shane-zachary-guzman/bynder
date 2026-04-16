import pool from '../config/db';
import bcrypt from 'bcryptjs';
import { User } from '../types/index';

/** Data-access methods for the `users` table. */
export const UserModel = {
  /**
   * Creates a new user and a corresponding free-plan subscription row in a single transaction.
   * Rolls back and re-throws if either insert fails.
   *
   * @param email - Unique email address for the new account.
   * @param password - Plaintext password; hashed with bcrypt (cost factor 12) before storage.
   * @param name - Optional display name for the user.
   * @returns The newly inserted {@link User} row.
   * @throws If the database insert fails or the transaction cannot be committed.
   */
  async create(email: string, password: string, name?: string): Promise<User> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const hash = await bcrypt.hash(password, 12);

      const { rows: userRows } = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [email, hash, name ?? null]
      );

      const user = userRows[0];
      if (!user) throw new Error('Failed to create user');

      // Atomically create a free subscription row
      await client.query(
        `INSERT INTO subscriptions (user_id, plan, status)
         VALUES ($1, 'free', 'active')`,
        [user.id]
      );

      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Looks up a user by their email address.
   *
   * @param email - The email address to search for.
   * @returns The matching {@link User} row, or `null` if no user exists with that email.
   */
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] ?? null;
  },

  /**
   * Looks up a user by their numeric primary key.
   *
   * @param id - The user's primary key.
   * @returns The matching {@link User} row, or `null` if no user exists with that id.
   */
  async findById(id: number): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  /**
   * Compares a plaintext password against a stored bcrypt hash.
   *
   * @param plaintext - The password supplied by the user at login.
   * @param hash - The bcrypt hash stored in the database.
   * @returns `true` when the password matches the hash, `false` otherwise.
   */
  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  },
};
