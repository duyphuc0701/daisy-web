const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config();

const MIGRATIONS_TABLE = "schema_migrations";
const DEFAULT_MIGRATIONS_DIRECTORY = path.join(
  __dirname,
  "../../database/migrations",
);

async function readMigrations(
  migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY,
) {
  const names = (await fs.readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const sql = await fs.readFile(
        path.join(migrationsDirectory, name),
        "utf8",
      );
      return {
        id: name,
        sql,
        checksum: crypto.createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedMigrations(connection) {
  const [rows] = await connection.query(
    `SELECT id, checksum, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY id ASC`,
  );
  return new Map(rows.map((row) => [row.id, row]));
}

async function runMigrations({
  connection,
  migrationsDirectory,
  logger = console,
} = {}) {
  if (!connection) throw new Error("A MySQL connection is required");

  await ensureMigrationsTable(connection);
  const migrations = await readMigrations(migrationsDirectory);
  const applied = await appliedMigrations(connection);
  const executed = [];

  for (const migration of migrations) {
    const previous = applied.get(migration.id);
    if (previous) {
      if (previous.checksum !== migration.checksum) {
        throw new Error(
          `Migration checksum changed after application: ${migration.id}`,
        );
      }
      logger.log(`Skipped ${migration.id} (already applied)`);
      continue;
    }

    // MySQL DDL can implicitly commit; keep each migration file idempotent and complete.
    await connection.query(migration.sql);
    await connection.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (id, checksum) VALUES (?, ?)`,
      [migration.id, migration.checksum],
    );
    executed.push(migration.id);
    logger.log(`Applied ${migration.id}`);
  }

  return { executed, migrations };
}

async function migrationStatus({
  connection,
  migrationsDirectory,
  logger = console,
} = {}) {
  if (!connection) throw new Error("A MySQL connection is required");
  await ensureMigrationsTable(connection);
  const migrations = await readMigrations(migrationsDirectory);
  const applied = await appliedMigrations(connection);
  const status = migrations.map((migration) => {
    const previous = applied.get(migration.id);
    return {
      id: migration.id,
      state: previous
        ? previous.checksum === migration.checksum
          ? "applied"
          : "checksum-mismatch"
        : "pending",
      appliedAt: previous?.applied_at || null,
    };
  });
  status.forEach((item) => logger.log(`${item.state.padEnd(17)} ${item.id}`));
  return status;
}

function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "daisy_library",
    multipleStatements: true,
  });
}

async function main() {
  const connection = await createConnection();
  try {
    const command = process.argv[2] || "up";
    if (command === "up") await runMigrations({ connection });
    else if (command === "status") await migrationStatus({ connection });
    else
      throw new Error(
        `Unknown migration command: ${command}. Use "up" or "status".`,
      );
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_MIGRATIONS_DIRECTORY,
  MIGRATIONS_TABLE,
  migrationStatus,
  readMigrations,
  runMigrations,
};
