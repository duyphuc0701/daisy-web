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

});
