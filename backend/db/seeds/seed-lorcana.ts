/**
 * @file seed-lorcana.ts
 * @description One-shot seed script for the `lorcana_repo` table.
 *
 * Usage:
 *   npx tsx db/seeds/seed-lorcana.ts <path-to-data-file>
 *
 * Example:
 *   npx tsx db/seeds/seed-lorcana.ts ./db/seeds/data/lorcana-cards.json
 *
 * Safe to re-run — inserts use ON CONFLICT DO NOTHING so existing rows
 * are never duplicated or overwritten.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load backend/.env relative to this file so the script works regardless
// of which directory it is invoked from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Allow DATABASE_URL to be overridden at invocation time, e.g.:
//   DATABASE_URL=postgresql://bynder:bynder_pass@localhost:5432/bynder_db npx tsx ...
// This is useful when running outside Docker where the hostname is localhost
// rather than the Docker service name "postgres".
const connectionString = process.env['DATABASE_URL'] ?? '';

const pool = new Pool({
  connectionString,
  // Render (and most hosted Postgres providers) require SSL for external connections.
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

/** Define of Source card's ability */
interface SourceAbitlity {
  effect: string;
  fullText: string;
  name: string;
  type: string;
}

/** JSON url sources for images */
interface SourceImages {
  full: string;
  thumbnail: string;
  foilMask: string;

}

/** A single card record as it appears in your raw source data. */
interface SourceCard {
  abilities: SourceAbitlity[];
  artists: string[];
  artistsText: string;
  code: string;
  color: string;
  cost: number;
  flavorText: string;
  foilTypes: string[];
  fullIdentifier: string;
  fullName: string;
  fullText: string;
  fullTextSections: string[];
  id: number,
  images: SourceImages;
  inkwell: boolean;
  lore: number;
  name: string;
  number: number;
  rarity: string;
  simpleName: string;
  story: string;
  strength: number;
  subtypes: string[];
  type: string;
  version: string;
  willpower: number;
}

/** JSON Structure of Lorcana Set with the cards */
interface SourceSet {
  prereleaseDate: string;
  releaseDate: string;
  hasAllCards: boolean;
  type: string;
  number: number;
  name: string;
  code: string;
  metadata: { [key: string]: unknown };
  cards: SourceCard[]
}

/** A row ready to be inserted into `lorcana_repo`. */
interface LorcanaRepoInsert {
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

/**
 * Maps a raw source card record to the `lorcana_repo` insert shape.
 *
 * Fill in the field mappings to match your source data format.
 * Any fields not promoted to dedicated columns should go into `metadata`.
 *
 * @param card - A single card from the source data file.
 * @param setName - The set the card belongs to
 * @returns A row ready to insert into `lorcana_repo`.
 */
function toRepoInsert(card: SourceCard, setName: string, setCode: string): LorcanaRepoInsert {
  const repoInsert: LorcanaRepoInsert = {
    name: card.name,
    ink_color: card.color,
    set_name: setName,
    card_number: `${card.number}`,
    card_type: card.type,
    image_url: card.images.full,
    lore_value: card.lore,
    rarity: card.rarity,
    set_code: setCode,
    metadata: {
      strength: card.strength,
      willpower: card.willpower,
      cost: card.cost,
      inkwell: card.inkwell
    }
  };

  return repoInsert;
}

// ─── Seed logic ───────────────────────────────────────────────────────────────

/**
 * Reads the source file, converts every record, and bulk-inserts into
 * `lorcana_repo` in batches. Uses ON CONFLICT DO NOTHING so the script
 * is safe to re-run at any time.
 *
 * @param filePath - Absolute path to the source data file.
 */
async function seed(filePath: string): Promise<void> {
  console.log(`Reading source file: ${filePath}`);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const sourceSet: SourceSet = JSON.parse(raw);
  const sourceCards: SourceCard[] = sourceSet.cards;

  console.log(`Parsed ${sourceCards.length} cards from source file.`);

  const rows: LorcanaRepoInsert[] = sourceCards.map(card => toRepoInsert(card, sourceSet.name, sourceSet.code));

  const BATCH_SIZE = 100;
  let inserted = 0;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      // Build a single multi-row INSERT for the batch
      const values: unknown[] = [];
      const placeholders = batch.map((row, idx) => {
        const base = idx * 10;
        values.push(
          row.set_code,
          row.set_name,
          row.card_number,
          row.name,
          row.ink_color,
          row.card_type,
          row.rarity,
          row.lore_value,
          row.image_url,
          JSON.stringify(row.metadata)
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
      });

      const result = await client.query(
        `INSERT INTO lorcana_repo
           (set_code, set_name, card_number, name, ink_color, card_type, rarity, lore_value, image_url, metadata)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (set_code, card_number) DO NOTHING`,
        values
      );

      inserted += result.rowCount ?? 0;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${result.rowCount ?? 0} rows.`);
    }

    await client.query('COMMIT');
    console.log(`Done. ${inserted} of ${rows.length} cards inserted (duplicates skipped).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // Only release the client back to the pool — do NOT call pool.end() here.
    // The entry point closes the pool once after all files are processed.
    client.release();
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Resolves the data directory, processes each set file sequentially,
 * then closes the pool once all files are done.
 *
 * Sequential processing (not concurrent) is intentional — it avoids
 * multiple seed() calls racing to close the shared pool.
 */
async function main(): Promise<void> {
  const lorcanaRepoDir = process.argv[2];

  if (!lorcanaRepoDir) {
    console.error('Error: no data directory path provided.');
    console.error('Usage: npx tsx db/seeds/seed-lorcana.ts <path-to-data-directory>');
    process.exit(1);
  }

  const filePaths = fs.readdirSync(lorcanaRepoDir)
    .filter(f => f.endsWith('.json'));

  if (filePaths.length === 0) {
    console.error('No .json files found in the provided directory.');
    process.exit(1);
  }

  console.log(`Found ${filePaths.length} set file(s) to process.\n`);

  for (const filePath of filePaths) {
    console.log(`--- Seeding: ${filePath}`);
    await seed(path.resolve(lorcanaRepoDir, filePath));
  }

  await pool.end();
  console.log('\nAll sets seeded successfully.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    pool.end().finally(() => process.exit(1));
  });
