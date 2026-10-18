import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "pg";
import { loadTs } from "./helpers/load-ts.mjs";

const { databaseConnectionString } = loadTs("lib/database-config.ts");
const baseUrl = "postgresql://test:encoded%40password@db.example.invalid:5432/reports";

test("deprecated SSL aliases use explicit full verification without emitting pg warnings", () => {
  const warnings = [];
  const originalWarning = process.emitWarning;
  process.emitWarning = (...args) => warnings.push(args);
  try {
    for (const mode of ["prefer", "require", "verify-ca"]) {
      const connectionString = databaseConnectionString(`${baseUrl}?sslmode=${mode}&application_name=scamcircuit`);
      const url = new URL(connectionString);
      assert.equal(url.searchParams.get("sslmode"), "verify-full");
      assert.equal(url.searchParams.get("application_name"), "scamcircuit");
      const client = new Client({ connectionString });
      assert.equal(client.connectionParameters.password, "encoded@password");
      assert.equal(client.connectionParameters.host, "db.example.invalid");
      assert.equal(client.connectionParameters.database, "reports");
      assert.deepEqual(client.connectionParameters.ssl, {});
      // Empty TLS options retain Node's CA and hostname checks.
      assert.equal(client.connectionParameters.ssl.rejectUnauthorized, undefined);
      assert.equal(client.connectionParameters.ssl.checkServerIdentity, undefined);
    }
    assert.deepEqual(warnings, []);
  } finally { process.emitWarning = originalWarning; }
});

test("explicit SSL settings, libpq compatibility, sockets and missing config are preserved", () => {
  for (const value of [undefined, "", "/var/run/postgresql reports", "socket:/var/run/postgresql?db=reports", baseUrl,
    ...["disable", "no-verify", "verify-full"].map((mode) => `${baseUrl}?sslmode=${mode}`),
    `${baseUrl}?sslmode=require&uselibpqcompat=true`,
  ]) assert.equal(databaseConnectionString(value), value);
  const client = new Client({ connectionString: databaseConnectionString(`${baseUrl}?sslmode=disable`) });
  assert.equal(client.connectionParameters.ssl, false);
});

test("hot reload replaces a cached pool using a deprecated SSL alias and reuses the corrected pool", () => {
  const previousPool = globalThis.pgPool;
  const previousUrl = process.env.DATABASE_URL;
  const previousMode = process.env.NODE_ENV;
  const pools = [];
  class FakePool {
    constructor(options) { this.options = options; this.ended = false; pools.push(this); }
    async end() { this.ended = true; }
  }
  try {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = `${baseUrl}?sslmode=require`;
    const oldPool = new FakePool({ connectionString: process.env.DATABASE_URL });
    globalThis.pgPool = oldPool;
    const mocks = { "server-only": {}, pg: { Pool: FakePool } };
    const { db } = loadTs("lib/db.ts", mocks);
    assert.equal(oldPool.ended, true);
    assert.notEqual(db, oldPool);
    assert.equal(new URL(db.options.connectionString).searchParams.get("sslmode"), "verify-full");
    assert.equal(loadTs("lib/db.ts", mocks).db, db);
    assert.equal(pools.length, 2);
  } finally {
    if (previousPool === undefined) delete globalThis.pgPool; else globalThis.pgPool = previousPool;
    if (previousUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousUrl;
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
  }
});
