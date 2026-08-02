const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, describe, it } = require("node:test");
const {
  migrationStatus,
  runMigrations,
} = require("../scripts/migrate");

const directories = [];
afterEach(async () =>
  Promise.all(
    directories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  ),
);

async function fixture(files) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "daisy-migrations-"),
  );
  directories.push(directory);
  await Promise.all(
    Object.entries(files).map(([name, sql]) =>
      fs.writeFile(path.join(directory, name), sql),
    ),
  );
  return directory;
}

function connection({ applied = [] } = {}) {
  const queries = [];
  return {
    queries,
    async query(sql, params) {
      queries.push([sql, params]);
      if (sql.includes("SELECT id, checksum")) return [applied];
      if (sql.includes("INSERT INTO schema_migrations"))
        applied.push({ id: params[0], checksum: params[1] });
      return [[]];
    },
  };
}

describe("migration runner", () => {
  it("applies sorted pending files and records their checksums", async () => {
    const directory = await fixture({
      "002_second.sql": "SELECT 2;",
      "001_first.sql": "SELECT 1;",
    });
    const database = connection();
    const result = await runMigrations({
      connection: database,
      migrationsDirectory: directory,
      logger: { log() {} },
    });
    assert.deepEqual(result.executed, ["001_first.sql", "002_second.sql"]);
    assert.equal(
      database.queries.filter(([sql]) =>
        sql.includes("INSERT INTO schema_migrations"),
      ).length,
      2,
    );
  });

  it("skips matching applied files and rejects rewritten migration history", async () => {
    const sql = "SELECT 1;";
    const directory = await fixture({ "001_first.sql": sql });
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    const database = connection({
      applied: [{ id: "001_first.sql", checksum }],
    });
    const result = await runMigrations({
      connection: database,
      migrationsDirectory: directory,
      logger: { log() {} },
    });
    assert.deepEqual(result.executed, []);
    await fs.writeFile(path.join(directory, "001_first.sql"), "SELECT 2;");
    await assert.rejects(
      () =>
        runMigrations({
          connection: database,
          migrationsDirectory: directory,
          logger: { log() {} },
        }),
      /checksum changed/,
    );
  });

  it("reports pending and applied status", async () => {
    const sql = "SELECT 1;";
    const directory = await fixture({
      "001_first.sql": sql,
      "002_second.sql": "SELECT 2;",
    });
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    const status = await migrationStatus({
      connection: connection({ applied: [{ id: "001_first.sql", checksum }] }),
      migrationsDirectory: directory,
      logger: { log() {} },
    });
    assert.deepEqual(
      status.map((item) => [item.id, item.state]),
      [
        ["001_first.sql", "applied"],
        ["002_second.sql", "pending"],
      ],
    );
  });

  it("keeps reviewed missing catalog rows in a non-destructive idempotent migration", async () => {
    const sql = await fs.readFile(
      path.join(
        __dirname,
        "../../database/migrations/20260729_add_audiobook_catalog_books.sql",
      ),
      "utf8",
    );
    assert.match(sql, /INSERT INTO books/i);
    assert.doesNotMatch(sql, /TRUNCATE|DELETE FROM books/i);
    for (const id of [202, 203, 204, 205])
      assert.match(sql, new RegExp(`\\b${id}\\b`));
    assert.match(sql, /ON DUPLICATE KEY UPDATE/i);
    assert.match(sql, /BINARY title = BINARY VALUES\(title\)/i);
  });

  it("owns the users table in a migration instead of bootstrap or seed files", async () => {
    const [bootstrap, seed, migration] = await Promise.all([
      fs.readFile(
        path.join(__dirname, "../../database/schema.sql"),
        "utf8",
      ),
      fs.readFile(path.join(__dirname, "../scripts/seed.js"), "utf8"),
      fs.readFile(
        path.join(
          __dirname,
          "../../database/migrations/20260801_add_users.sql",
        ),
        "utf8",
      ),
    ]);

    assert.doesNotMatch(bootstrap, /CREATE TABLE IF NOT EXISTS users/i);
    assert.doesNotMatch(seed, /CREATE TABLE IF NOT EXISTS users/i);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS users/i);
    assert.match(migration, /username VARCHAR\(255\) NOT NULL UNIQUE/i);
    assert.match(migration, /email VARCHAR\(255\) NOT NULL UNIQUE/i);
    assert.match(migration, /reset_token_expiry DATETIME NULL/i);
    assert.match(
      migration,
      /created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP/i,
    );
  });
});
