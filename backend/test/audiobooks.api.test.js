const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { afterEach, describe, it, mock } = require("node:test");
const { createApp } = require("../src/app");
const {
  DEVELOPMENT_PRINCIPAL,
  createAudiobookSecurity,
  parseDevelopmentBypass,
} = require("../src/config/audiobook-security");
const { parseSingleRange } = require("../src/utils/byte-range");
const servers = new Set();
const bytes = Buffer.from("0123456789");
afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    ),
  );
  servers.clear();
});
async function request(options, path, init) {
  const server = createApp(options).listen(0);
  servers.add(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
}
function setup({
  principal = { id: "patron-1", roles: [] },
  allowed = true,
  limiter,
} = {}) {
  const part = {
    id: 104,
    book_id: 42,
    part_number: 1,
    title: "Chapter 1",
    r2_key: "audio-books/book-42.mp3",
    mime_type: "audio/mpeg",
    duration_ms: 10000,
    language: "vi",
    narrator: "Reader",
    transcript_r2_key: "audio-books/book-42.json",
    transcript_format: "json",
  };
  const storage = {
    head: mock.fn(async () => ({
      contentLength: bytes.length,
      contentType: "audio/mpeg",
      etag: '"etag-1"',
      lastModified: new Date("2025-01-01T00:00:00Z"),
    })),
    get: mock.fn(async (_key, { range } = {}) => {
      const match = range && /bytes=(\d+)-(\d+)/.exec(range);
      const body = match
        ? bytes.subarray(Number(match[1]), Number(match[2]) + 1)
        : bytes;
      return {
        body: Readable.from(body),
        contentLength: body.length,
        contentType: "audio/mpeg",
      };
    }),
    getTranscript: mock.fn(async () => ({
      text: JSON.stringify({
        segments: [{ startMs: 0, endMs: 1000, text: "Hello" }],
      }),
    })),
  };
  const repository = {
    findCatalog: mock.fn(async () => ({
      book: { id: 42, title: "Accessible book" },
      parts: [part],
      chapters: [
        {
          id: 1,
          part_id: 104,
          sequence: 1,
          title: "Chapter 1",
          start_ms: 0,
          end_ms: 10000,
        },
      ],
    })),
    findPart: mock.fn(async (bookId, partId) =>
      Number(bookId) === 42 && Number(partId) === 104 ? part : null,
    ),
  };
  const rateLimiter = limiter || {
    acquire: mock.fn(() => ({ allowed: true, release: mock.fn() })),
  };
  return {
    database: { query: mock.fn(async () => [[]]) },
    audiobooksRepository: repository,
    audioStorage: storage,
    authenticateRequest: async () => principal,
    audioAccessPolicy: { canAccess: async () => allowed },
    audioRateLimiter: rateLimiter,
    audioCors: (_req, _res, next) => next(),
    storage,
    repository,
  };
}
describe("audiobook API", () => {
  it("rejects anonymous discovery before repository or storage access", async () => {
    const options = setup({ principal: null });
    const response = await request(options, "/api/books/42/audio");
    assert.equal(response.status, 401);
    assert.equal(options.repository.findCatalog.mock.callCount(), 0);
    assert.equal(options.storage.head.mock.callCount(), 0);
  });
  it("rejects an unauthorized stream before storage access", async () => {
    const options = setup({ allowed: false });
    const response = await request(options, "/api/books/42/audio/104/stream");
    assert.equal(response.status, 403);
    assert.equal(options.storage.head.mock.callCount(), 0);
  });
  it("returns accessible discovery metadata without an R2 key", async () => {
    const options = setup();
    const response = await request(options, "/api/books/42/audio");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.parts[0].streamUrl, "/api/books/42/audio/104/stream");
    assert.equal(body.parts[0].chapters[0].startMs, 0);
    assert.equal(JSON.stringify(body).includes("r2_key"), false);
  });
  it("allows cookie-free playback through the explicit development bypass", async () => {
    const options = setup();
    delete options.authenticateRequest;
    delete options.audioAccessPolicy;
    options.audiobookSecurity = createAudiobookSecurity({
      env: {
        NODE_ENV: "development",
        AUDIO_DEV_BYPASS_AUTH: "true",
      },
    });

    const catalog = await request(options, "/api/books/42/audio");
    assert.equal(catalog.status, 200);

    const stream = await request(
      options,
      "/api/books/42/audio/104/stream",
    );
    assert.equal(stream.status, 200);
    assert.equal(await stream.text(), "0123456789");
  });
  it("streams a full MP3 with safe private headers", async () => {
    const response = await request(setup(), "/api/books/42/audio/104/stream");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("content-length"), "10");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  });
  it("streams an exact byte range", async () => {
    const response = await request(setup(), "/api/books/42/audio/104/stream", {
      headers: { Range: "bytes=2-5" },
    });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), "bytes 2-5/10");
    assert.equal(response.headers.get("content-length"), "4");
    assert.equal(await response.text(), "2345");
  });
  it("rejects unsatisfiable ranges before creating an R2 body", async () => {
    const options = setup();
    const response = await request(options, "/api/books/42/audio/104/stream", {
      headers: { Range: "bytes=10-11" },
    });
    assert.equal(response.status, 416);
    assert.equal(response.headers.get("content-range"), "bytes */10");
    assert.equal(options.storage.get.mock.callCount(), 0);
  });
  it("supports HEAD and conditional requests without an object body", async () => {
    const options = setup();
    const head = await request(options, "/api/books/42/audio/104/stream", {
      method: "HEAD",
      headers: { Range: "bytes=2-5" },
    });
    assert.equal(head.status, 206);
    assert.equal(head.headers.get("content-range"), "bytes 2-5/10");
    assert.equal(options.storage.get.mock.callCount(), 0);
    const cached = await request(options, "/api/books/42/audio/104/stream", {
      headers: { "If-None-Match": '"etag-1"' },
    });
    assert.equal(cached.status, 304);
    assert.equal(options.storage.get.mock.callCount(), 0);
  });
  it("returns transcript JSON and text and validates format", async () => {
    const options = setup();
    const json = await request(options, "/api/books/42/audio/104/transcript");
    assert.equal(json.status, 200);
    assert.deepEqual((await json.json()).segments[0], {
      startMs: 0,
      endMs: 1000,
      text: "Hello",
    });
    const text = await request(
      options,
      "/api/books/42/audio/104/transcript?format=text",
    );
    assert.equal(text.status, 200);
    assert.match(text.headers.get("content-type"), /^text\/plain/);
    const invalid = await request(
      options,
      "/api/books/42/audio/104/transcript?format=xml",
    );
    assert.equal(invalid.status, 400);
  });
  it("returns 429 before R2 access when limiter denies a stream", async () => {
    const limiter = {
      acquire: mock.fn(() => ({ allowed: false, retryAfter: 60 })),
    };
    const options = setup({ limiter });
    const response = await request(options, "/api/books/42/audio/104/stream");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(options.repository.findPart.mock.callCount(), 0);
    assert.equal(options.storage.head.mock.callCount(), 0);
  });
});

describe("audiobook development security", () => {
  it("fails closed unless the bypass is explicitly enabled", async () => {
    const security = createAudiobookSecurity({ env: {} });

    assert.equal(await security.authenticateRequest({ headers: {} }), null);
  });

  it("rejects bypass configuration outside development", () => {
    for (const nodeEnv of [undefined, "test", "production"]) {
      assert.throws(
        () =>
          createAudiobookSecurity({
            env: {
              NODE_ENV: nodeEnv,
              AUDIO_DEV_BYPASS_AUTH: "true",
            },
          }),
        /allowed only when NODE_ENV=development/,
      );
    }
  });

  it("rejects ambiguous bypass values", () => {
    assert.throws(
      () => parseDevelopmentBypass("yes"),
      /must be true or false/,
    );
  });
});
describe("byte range parser", () => {
  it("supports explicit, open, and suffix ranges", () => {
    assert.deepEqual(parseSingleRange("bytes=2-5", 10), {
      start: 2,
      end: 5,
      length: 4,
      header: "bytes=2-5",
    });
    assert.deepEqual(parseSingleRange("bytes=8-", 10), {
      start: 8,
      end: 9,
      length: 2,
      header: "bytes=8-9",
    });
    assert.deepEqual(parseSingleRange("bytes=-3", 10), {
      start: 7,
      end: 9,
      length: 3,
      header: "bytes=7-9",
    });
  });
});

describe("credentialed audio CORS and validators", () => {
  it("allows configured origins, handles preflight, and ignores a mismatched If-Range", async () => {
    const options = setup();
    delete options.audioCors;
    const stream = await request(options, "/api/books/42/audio/104/stream", {
      headers: {
        Origin: "http://localhost:5173",
        Range: "bytes=2-5",
        "If-Range": '"different"',
      },
    });
    assert.equal(stream.status, 200);
    assert.equal(
      stream.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    assert.equal(await stream.text(), "0123456789");
    const preflight = await request(options, "/api/books/42/audio/104/stream", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Range",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get("access-control-allow-credentials"),
      "true",
    );
  });
});
