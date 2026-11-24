/**
 * Aplica schema + seed no Postgres local.
 * DATABASE_URL padrão: postgres://postgres:1234@localhost:5432/mapa_crpm
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(__dirname, "..");
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:1234@localhost:5432/mapa_crpm";

async function main() {
  const schema = fs.readFileSync(
    path.join(ROOT, "data/seed/01_schema.sql"),
    "utf8"
  );
  const data = fs.readFileSync(path.join(ROOT, "data/seed/02_seed.sql"), "utf8");

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(schema);
    await client.query(data);
    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM municipio_unidade_bm"
    );
    console.log(`Seed OK: ${rows[0].n} vínculos município↔CRPM`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
