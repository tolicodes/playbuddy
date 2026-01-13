import { Pool } from "pg";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const shouldUseSsl =
  /sslmode=require/i.test(connectionString ?? "") ||
  process.env.PGSSLMODE === "require" ||
  process.env.POSTGRES_SSL === "true";

let pool: Pool | null = null;

const getPool = () => {
  if (pool) return pool;

  if (!connectionString && !process.env.PGHOST && !process.env.PGUSER && !process.env.PGDATABASE) {
    throw new Error("Postgres connection not configured. Set POSTGRES_URL/DATABASE_URL or PGHOST/PGUSER/PGDATABASE.");
  }

  pool = new Pool({
    connectionString: connectionString || undefined,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });

  pool.on("error", (err) => {
    console.error("[postgres] unexpected error", err);
  });

  return pool;
};

export const pgQuery = (text: string, params?: Array<any>) => {
  return getPool().query(text, params);
};
