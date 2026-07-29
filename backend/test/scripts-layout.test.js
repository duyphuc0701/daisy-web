const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const backendRoot = path.resolve(__dirname, "..");
const applicationRoot = path.resolve(backendRoot, "..");

function filesUnder(root, predicate) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return filesUnder(target, predicate);
    return predicate(target) ? [target] : [];
  });
}

describe("backend operational scripts layout", () => {
  it("keeps executable maintenance CLIs under backend/scripts", () => {
    for (const file of [
      "migrate.js",
      "seed.js",
      "ingest-audiobook.js",
      "bulk-ingest-audiobooks.js",
    ])
      assert.equal(
        fs.existsSync(path.join(backendRoot, file)),
        false,
        `${file} must live under backend/scripts`,
      );

    for (const file of [
      "migrate.js",
      "seed.js",
      "publish-audiobook-metadata.js",
    ])
      assert.equal(
        fs.existsSync(path.join(backendRoot, "scripts", file)),
        true,
        `Missing backend/scripts/${file}`,
      );
  });

  it("routes package commands through the metadata-only boundary", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(backendRoot, "package.json"), "utf8"),
    );
    assert.equal(
      packageJson.scripts["db:migrate"],
      "node scripts/migrate.js up",
    );
    assert.equal(
      packageJson.scripts["db:migrate:status"],
      "node scripts/migrate.js status",
    );
    assert.equal(
      packageJson.scripts["db:seed"],
      "node scripts/seed.js",
    );
    assert.equal(
      packageJson.scripts["db:audiobooks:publish"],
      "node scripts/publish-audiobook-metadata.js",
    );
    for (const command of Object.keys(packageJson.scripts))
      assert.doesNotMatch(command, /upload|generate/);
  });

  it("contains no audiobook object-write implementation", () => {
    for (const relativePath of [
      "scripts/upload-audiobook.js",
      "scripts/upload-audiobooks.js",
      "scripts/generate-audiobook-metadata.js",
      "src/ingestion/daisy-plan.js",
      "src/ingestion/object-plan.js",
      "src/ingestion/r2-ingestion-storage.js",
      "src/ingestion/run-report.js",
    ])
      assert.equal(
        fs.existsSync(path.join(backendRoot, relativePath)),
        false,
        `${relativePath} belongs outside the application repository`,
      );

    for (const file of [
      ...filesUnder(path.join(backendRoot, "scripts"), (name) =>
        name.endsWith(".js"),
      ),
      ...filesUnder(path.join(backendRoot, "src"), (name) =>
        name.endsWith(".js"),
      ),
    ]) {
      const source = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(source, /PutObjectCommand/);
      assert.doesNotMatch(source, /CLOUDFLARE_S3_INGEST_/);
    }
  });

  it("keeps application documentation metadata-only", () => {
    const markdown = [
      path.join(applicationRoot, "README.md"),
      path.join(backendRoot, "README.md"),
      ...filesUnder(path.join(backendRoot, "docs"), (name) =>
        name.endsWith(".md"),
      ),
    ];
    for (const file of markdown)
      assert.doesNotMatch(
        fs.readFileSync(file, "utf8"),
        /\bupload(?:s|ed|ing)?\b/i,
        `${path.relative(applicationRoot, file)} documents an external operation`,
      );
  });
});
