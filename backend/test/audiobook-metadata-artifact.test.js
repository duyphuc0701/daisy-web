const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  createMetadataArtifact,
  validateMetadataArtifact,
} = require("../src/ingestion/audiobook-metadata-artifact");

const REVISION = "a".repeat(64);
const MANIFEST_DIGEST = "b".repeat(64);

function artifactBook(overrides = {}) {
  const base = `audio-books/book-one/revisions/${REVISION}`;
  return {
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
      {
        key: `${base}/transcripts/part-1.json`,
        revision: REVISION,
        sha256: "d".repeat(64),
        contentType: "application/json; charset=utf-8",
        contentLength: 40,
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
        language: "vi-VN",
        narrator: null,
        transcriptR2Key: `${base}/transcripts/part-1.json`,
        transcriptFormat: "timed-text",
        chapters: [
          {
            sequence: 1,
            title: "Chapter 1",
            startMs: 0,
            endMs: 1000,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("audiobook metadata artifact", () => {
  it("creates and validates a deterministic publisher-ready artifact", () => {
    const artifact = createMetadataArtifact({
      manifestDigest: MANIFEST_DIGEST,
      r2Prefix: "audio-books",
      books: [artifactBook()],
    });

    assert.deepEqual(artifact.summary, {
      books: 1,
      parts: 1,
      chapters: 1,
      objects: 2,
      bytes: 140,
    });
    assert.match(artifact.artifactDigest, /^[a-f0-9]{64}$/);
    assert.deepEqual(
      validateMetadataArtifact(artifact, {
        expectedPrefix: "audio-books",
      }),
      artifact,
    );
    assert.equal(
      createMetadataArtifact({
        manifestDigest: MANIFEST_DIGEST,
        r2Prefix: "audio-books/",
        books: [artifactBook()],
      }).artifactDigest,
      artifact.artifactDigest,
    );

    const reorderedSummary = structuredClone(artifact);
    reorderedSummary.summary = {
      bytes: artifact.summary.bytes,
      objects: artifact.summary.objects,
      chapters: artifact.summary.chapters,
      parts: artifact.summary.parts,
      books: artifact.summary.books,
    };
    assert.deepEqual(
      validateMetadataArtifact(reorderedSummary).summary,
      artifact.summary,
    );
  });

  it("rejects digest tampering, cross-prefix keys, and absent part objects", () => {
    const artifact = createMetadataArtifact({
      manifestDigest: MANIFEST_DIGEST,
      r2Prefix: "audio-books",
      books: [artifactBook()],
    });
    const tampered = structuredClone(artifact);
    tampered.books[0].title = "Changed";
    assert.throws(
      () => validateMetadataArtifact(tampered),
      /digest mismatch/,
    );

    assert.throws(
      () =>
        createMetadataArtifact({
          manifestDigest: MANIFEST_DIGEST,
          r2Prefix: "audio-books",
          books: [
            artifactBook({
              objects: artifactBook().objects.map((object) => ({
                ...object,
                key: object.key.replace("audio-books/", "other/"),
              })),
            }),
          ],
        }),
      /key violates artifact revision/,
    );

    assert.throws(
      () =>
        createMetadataArtifact({
          manifestDigest: MANIFEST_DIGEST,
          r2Prefix: "audio-books",
          books: [
            artifactBook({
              objects: [artifactBook().objects[1]],
            }),
          ],
        }),
      /audio object is absent/,
    );
  });
});
