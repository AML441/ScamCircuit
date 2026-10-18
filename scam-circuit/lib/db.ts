import "server-only";
import { Pool } from "pg";
import { databaseConnectionString } from "./database-config";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

const connectionString = databaseConnectionString(process.env.DATABASE_URL);
const cachedPool = globalForPg.pgPool;
const reusePool = cachedPool?.options.connectionString === connectionString;

// Hot reload can retain a pool created before the SSL configuration was fixed.
if (cachedPool && !reusePool) void cachedPool.end().catch(() => {});

export const db =
  (reusePool ? cachedPool : undefined) ??
  new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = db;
}
