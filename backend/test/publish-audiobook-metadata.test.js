const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, describe, it } = require("node:test");
const {
  createMetadataArtifact,
} = require("../src/ingestion/audiobook-metadata-artifact");
const {
  parseArgs,
  runMetadataPublication,
} = require("../scripts/publish-audiobook-metadata");

const directories = [];
const REVISION = "a".repeat(64);

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) =>
        fs.rm(directory, { recursive: true, force: true }),
      ),
  );
});

function artifact() {
  const base = `audio-books/book-one/revisions/${REVISION}`;
  return createMetadataArtifact({
    manifestDigest: "b".repeat(64),
    r2Prefix: "audio-books",
    books: [
      {
        bookId: 1,
        slug: "book-one",
        title: "Book One",
        revision: REVISION,
        expectedPriorRevision: null,
        objects: [
          {
            key: `${base}/audio/part-1.mp3`,
            revision: REVISION,
            sha256: "c".repeat(64),
            contentType: "audio/mpeg",
            contentLength: 100,
          },
        ],
        parts: [
          {
            partNumber: 1,
            title: "Part 1",
            r2Key: `${base}/audio/part-1.mp3`,
            mimeType: "audio/mpeg",
            durationMs: 1000,
            byteLength: 100,
            etag: null,
            lastModifiedAt: null,
            language: "vi-VN",
            narrator: null,
            transcriptR2Key: null,
            transcriptFormat: null,
            chapters: [],
          },
        ],
      },
    ],
  });
}

describe("publish audiobook metadata CLI", () => {
  it("parses optional filters and bounded verification concurrency", () => {
    assert.deepEqual(
      parseArgs([
        "--artifact",
        "artifact.json",
        "--only",
        "book-one,book-two",
        "--concurrency",
        "3",
        "--report",
        "report.json",
      ]),
      {
        artifact: path.resolve("artifact.json"),
        only: ["book-one", "book-two"],
        concurrency: 3,
        report: path.resolve("report.json"),
      },
    );
    assert.throws(
      () => parseArgs(["--concurrency", "17"]),
      /between 1 and 16/,
    );
  });

  it("publishes a validated artifact with read-only R2 configuration and checkpoints a report", async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "metadata-publish-"),
    );
    directories.push(directory);
    const artifactPath = path.join(directory, "artifact.json");
    const reportPath = path.join(directory, "report.json");
    await fs.writeFile(
      artifactPath,
      JSON.stringify(artifact()),
    );
    const calls = [];
    const database = {
      async end() {
        calls.push("database.end");
      },
    };

    const result = await runMetadataPublication(
      {
        artifact: artifactPath,
        concurrency: 2,
        only: null,
        report: reportPath,
      },
      {
        env: {
          CLOUDFLARE_S3_FOLDER_NAME: "audio-books",
        },
        createR2Client() {
          return {
            client: {},
            bucket: "bucket",
            prefix: "audio-books/",
            missing: [],
          };
        },
        createStorage(options) {
          calls.push(["createStorage", options]);
          return {};
        },
        database,
        async publishMetadata({ artifact: selected, onBook }) {
          assert.equal(selected.books.length, 1);
          const published = {
            bookId: 1,
            slug: "book-one",
            status: "published",
            revision: REVISION,
            parts: 1,
            chapters: 0,
            objects: 1,
          };
          await onBook(published);
          return [published];
        },
      },
    );

    assert.equal(result.report.state, "completed");
    assert.equal(result.report.summary.published, 1);
    assert.equal(result.report.summary.failed, 0);
    assert.equal(calls.at(-1), "database.end");
    assert.deepEqual(
      JSON.parse(await fs.readFile(reportPath, "utf8")),
      result.report,
    );
  });

  it("rejects unknown filters before creating R2 or database clients", async () => {
    let created = false;
    await assert.rejects(
      () =>
        runMetadataPublication(
          {
            artifact: "artifact.json",
            concurrency: 2,
            only: ["missing"],
            report: null,
          },
          {
            env: {
              CLOUDFLARE_S3_FOLDER_NAME: "audio-books",
            },
            async readFile() {
              return JSON.stringify(artifact());
            },
            createR2Client() {
              created = true;
              return {};
            },
          },
        ),
      /Unknown artifact slug/,
    );
    assert.equal(created, false);
  });
});
