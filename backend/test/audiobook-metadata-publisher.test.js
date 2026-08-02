const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const {
  publishMetadataArtifact,
} = require("../src/ingestion/audiobook-metadata-publisher");

const REVISION = "a".repeat(64);
const OBJECT = {
  key: `audio-books/book-one/revisions/${REVISION}/audio/part-1.mp3`,
  revision: REVISION,
  sha256: "b".repeat(64),
  contentType: "audio/mpeg",
  contentLength: 100,
};

function artifact() {
  return {
    books: [
      {
        bookId: 1,
        slug: "book-one",
        title: "Book One",
        revision: REVISION,
        expectedPriorRevision: null,
        objects: [OBJECT],
        parts: [
          {
            partNumber: 1,
            title: "Part 1",
            r2Key: OBJECT.key,
            mimeType: "audio/mpeg",
            durationMs: 1000,
            byteLength: 100,
            etag: null,
            lastModifiedAt: null,
            language: "vi-VN",
            narrator: null,
            transcriptR2Key: null,
            transcriptFormat: null,
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
      },
    ],
  };
}

function database(title = "Book One") {
  return {
    async query(sql) {
      assert.match(sql, /SELECT id, title FROM books/);
      return [[{ id: 1, title }]];
    },
  };
}

function storage(overrides = {}) {
  return {
    async head() {
      return {
        contentLength: 100,
        contentType: "audio/mpeg",
        etag: '"etag"',
        lastModified: new Date("2026-07-29T00:00:00Z"),
        metadata: {
          sha256: OBJECT.sha256,
          revision: REVISION,
        },
        ...overrides,
      };
    },
  };
}

function publishedSnapshot(revision = REVISION) {
  return {
    exists: true,
    revision,
    parts: [
      {
        id: 10,
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
  };
}

describe("audiobook metadata publisher", () => {
  it("verifies R2 before publishing metadata and reconciles the database", async () => {
    const calls = [];
    const publisher = {
      reconciliation: 0,
      async reconcile(bookId) {
        calls.push(["reconcile", bookId]);
        this.reconciliation += 1;
        return this.reconciliation === 1
          ? { exists: true, revision: null, parts: [] }
          : publishedSnapshot();
      },
      async publish(command) {
        calls.push(["publish", command]);
        assert.equal(command.parts[0].etag, '"etag"');
        assert.equal(
          command.parts[0].lastModifiedAt.toISOString(),
          "2026-07-29T00:00:00.000Z",
        );
        return { status: "published" };
      },
    };

    const result = await publishMetadataArtifact({
      artifact: artifact(),
      database: database(),
      storage: {
        async head(key) {
          calls.push(["head", key]);
          return storage().head();
        },
      },
      publisher,
    });

    assert.equal(result[0].status, "published");
    assert.deepEqual(
      calls.map(([name]) => name),
      ["head", "reconcile", "publish", "reconcile"],
    );
  });

  it("reconciles an already-published revision without mutating the database", async () => {
    const publisher = {
      async reconcile() {
        return publishedSnapshot();
      },
      async publish() {
        throw new Error("must not publish an existing revision");
      },
    };
    const result = await publishMetadataArtifact({
      artifact: artifact(),
      database: database(),
      storage: storage(),
      publisher,
    });
    assert.equal(result[0].status, "already_published");
  });

  it("fails before publication on missing R2 metadata or a stale fence", async () => {
    let published = false;
    const publisher = {
      async reconcile() {
        return { exists: true, revision: null, parts: [] };
      },
      async publish() {
        published = true;
        return { status: "published" };
      },
    };
    await assert.rejects(
      () =>
        publishMetadataArtifact({
          artifact: artifact(),
          database: database(),
          storage: {
            async head() {
              return null;
            },
          },
          publisher,
        }),
      /R2 metadata verification failed/,
    );
    assert.equal(published, false);

    await assert.rejects(
      () =>
        publishMetadataArtifact({
          artifact: artifact(),
          database: database(),
          storage: {
            async head() {
              const error = new Error("UnknownError");
              error.name = "Unknown";
              error.$metadata = { httpStatusCode: 403 };
              throw error;
            },
          },
          publisher,
        }),
      /R2 HEAD failed.*HTTP 403.*Unknown/,
    );
    assert.equal(published, false);

    await assert.rejects(
      () =>
        publishMetadataArtifact({
          artifact: artifact(),
          database: database(),
          storage: storage(),
          publisher: {
            async reconcile() {
              return {
                exists: true,
                revision: "c".repeat(64),
                parts: [],
              };
            },
            async publish() {
              throw new Error("must not publish a stale revision");
            },
          },
        }),
      /Publication fence is stale/,
    );
  });

  it("fails on a target catalog title mismatch before reading R2", async () => {
    let headCalled = false;
    await assert.rejects(
      () =>
        publishMetadataArtifact({
          artifact: artifact(),
          database: database("Different"),
          storage: {
            async head() {
              headCalled = true;
              return storage().head();
            },
          },
          publisher: {},
        }),
      /Target DB title mismatch/,
    );
    assert.equal(headCalled, false);
  });
});
