const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  createR2MetadataReader,
  verifyObjectMetadata,
} = require("../src/ingestion/r2-metadata-reader");

const expected = {
  key: "audio-books/book/revisions/revision/audio/part.mp3",
  revision: "a".repeat(64),
  sha256: "b".repeat(64),
  contentType: "audio/mpeg",
  contentLength: 100,
};

describe("R2 metadata reader", () => {
  it("uses HeadObject only and normalizes expected metadata", async () => {
    const commands = [];
    const reader = createR2MetadataReader({
      client: {
        async send(command) {
          commands.push(command);
          return {
            ContentLength: 100,
            ContentType: "audio/mpeg",
            ETag: '"etag"',
            LastModified: new Date("2026-07-29T00:00:00Z"),
            Metadata: {
              SHA256: expected.sha256,
              Revision: expected.revision,
            },
          };
        },
      },
      bucket: "private",
      prefix: "audio-books/",
    });

    const actual = await reader.head(expected.key);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].constructor.name, "HeadObjectCommand");
    assert.equal(verifyObjectMetadata(actual, expected).ok, true);
  });

  it("returns null for a missing object and rejects cross-prefix keys", async () => {
    const reader = createR2MetadataReader({
      client: {
        async send() {
          const error = new Error("missing");
          error.$metadata = { httpStatusCode: 404 };
          throw error;
        },
      },
      bucket: "private",
      prefix: "audio-books/",
    });

    assert.equal(await reader.head(expected.key), null);
    await assert.rejects(
      () => reader.head("other/key"),
      /must remain inside prefix/,
    );
  });
});
