const assert = require("node:assert/strict");
const { afterEach, describe, it, mock } = require("node:test");
const bcrypt = require("bcrypt");

const { createApp } = require("../src/app");

const servers = new Set();

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

async function startApp(options) {
  const server = createApp(options).listen(0);
  servers.add(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

describe("authentication and audiobook integration", () => {
  it("issues a protected media cookie and blocks anonymous work before catalog access", async () => {
    const passwordHash = await bcrypt.hash("correct horse", 4);
    const database = {
      query: mock.fn(async (sql) => {
        if (sql === "SELECT * FROM users WHERE username = ?") {
          return [
            [
              {
                id: 7,
                username: "reader",
                email: "reader@example.com",
                password: passwordHash,
              },
            ],
          ];
        }
        return [[]];
      }),
    };
    const audiobooksRepository = {
      findCatalog: mock.fn(async () => ({
        book: { id: 42, title: "Protected book" },
        parts: [
          {
            id: 104,
            part_number: 1,
            title: "Part 1",
            duration_ms: 1000,
            mime_type: "audio/mpeg",
            language: "vi",
            narrator: "Reader",
            transcript_r2_key: null,
          },
        ],
        chapters: [],
      })),
      findPart: mock.fn(),
    };
    const baseUrl = await startApp({
      database,
      audiobooksRepository,
      audioStorage: {},
      authEnv: {
        NODE_ENV: "test",
        JWT_SECRET: "integration-test-secret",
        AUDIO_SESSION_COOKIE_NAME: "daisy_session",
        AUDIO_DEV_BYPASS_AUTH: "false",
        CORS_ALLOWED_ORIGINS: "http://localhost:5173",
      },
    });

    const anonymous = await fetch(`${baseUrl}/api/books/42/audio`);
    assert.equal(anonymous.status, 401);
    assert.equal(audiobooksRepository.findCatalog.mock.callCount(), 0);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "reader",
        password: "correct horse",
      }),
    });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie");
    assert.match(setCookie, /^daisy_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);

    const cookie = setCookie.split(";", 1)[0];
    const authorized = await fetch(`${baseUrl}/api/books/42/audio`, {
      headers: { Cookie: cookie },
    });
    assert.equal(authorized.status, 200);
    assert.equal(audiobooksRepository.findCatalog.mock.callCount(), 1);
    assert.equal((await authorized.json()).bookId, 42);

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get("set-cookie"), /^daisy_session=;/);
  });
});
