/*
 * Step 2 backfill (idempotent script, NOT a migration).
 *
 * For every existing warehouse: ensure one default
 * Aisle -> Bay -> Layer chain (code UNASSIGNED), then
 * point every storage_space with NULL layer_id at that
 * warehouse's default layer.
 *
 * Safe to re-run: uses ON CONFLICT DO NOTHING for the
 * defaults and only touches rows still missing layer_id.
 * Ends by verifying zero NULLs remain and exits non-zero
 * if any do (Step 3 must not proceed in that case).
 *
 * Usage:
 *   node scripts/backfill-physical-hierarchy.mjs
 *   DATABASE_URL=... node scripts/backfill-physical-hierarchy.mjs
 */

import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const loadEnvFile = (file) => {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
};

loadEnvFile(".env.local");
loadEnvFile(".env");

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://warehouse2:warehouse2@localhost:5433/warehouse2";

const DEFAULT_CODE = "UNASSIGNED";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const run = async () => {
  const warehouses = await pool.query(`SELECT id, code FROM warehouses`);

  let ensured = 0;
  let repointed = 0;

  for (const warehouse of warehouses.rows) {
    // One default aisle per warehouse (idempotent).
    const aisleResult = await pool.query(
      `INSERT INTO aisles (warehouse_id, code, name, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (warehouse_id, code) DO NOTHING`,
      [warehouse.id, DEFAULT_CODE, "Unassigned aisle"],
    );
    ensured += aisleResult.rowCount ?? 0;

    const {
      rows: [aisle],
    } = await pool.query(
      `SELECT id FROM aisles WHERE warehouse_id = $1 AND code = $2`,
      [warehouse.id, DEFAULT_CODE],
    );

    await pool.query(
      `INSERT INTO bays (aisle_id, code, name, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (aisle_id, code) DO NOTHING`,
      [aisle.id, DEFAULT_CODE, "Unassigned bay"],
    );

    const {
      rows: [bay],
    } = await pool.query(
      `SELECT id FROM bays WHERE aisle_id = $1 AND code = $2`,
      [aisle.id, DEFAULT_CODE],
    );

    await pool.query(
      `INSERT INTO layers (bay_id, code, name, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (bay_id, code) DO NOTHING`,
      [bay.id, DEFAULT_CODE, "Unassigned layer"],
    );

    const {
      rows: [layer],
    } = await pool.query(
      `SELECT id FROM layers WHERE bay_id = $1 AND code = $2`,
      [bay.id, DEFAULT_CODE],
    );

    // Only touch spaces still missing a layer.
    const updated = await pool.query(
      `UPDATE storage_spaces
       SET layer_id = $1
       WHERE warehouse_id = $2 AND layer_id IS NULL`,
      [layer.id, warehouse.id],
    );
    repointed += updated.rowCount ?? 0;
  }

  const {
    rows: [{ count }],
  } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM storage_spaces WHERE layer_id IS NULL`,
  );

  console.log(
    `warehouses=${warehouses.rows.length} defaults_ensured=${ensured} spaces_repointed=${repointed} remaining_nulls=${count}`,
  );

  if (Number(count) > 0) {
    throw new Error(
      `${count} storage_spaces still have NULL layer_id — Step 3 must not proceed.`,
    );
  }
};

try {
  await run();
} finally {
  await pool.end();
}
