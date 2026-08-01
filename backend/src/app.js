const cors = require("cors");
const express = require("express");

const defaultDatabase = require("./config/database");
const { createJwtAuthenticator } = require("./config/auth");
const { createR2ClientFromEnv } = require("./config/r2");
const { createAudiobookSecurity } = require("./config/audiobook-security");
const createAudiobooksController = require("./controllers/audiobooks.controller");
const createAuthController = require("./controllers/auth.controller");
const createBooksController = require("./controllers/books.controller");
const createCategoriesController = require("./controllers/categories.controller");
const { createAuthMiddleware } = require("./middleware/auth.middleware");
const errorHandler = require("./middleware/error-handler");
const createRequireAuthenticatedUser = require("./middleware/require-authenticated-user");
const createAudiobooksRepository = require("./repositories/audiobooks.repository");
const createAuthRepository = require("./repositories/auth.repository");
const createBooksRepository = require("./repositories/books.repository");
const createCategoriesRepository = require("./repositories/categories.repository");
const createAudiobooksRouter = require("./routes/audiobooks.routes");
const createAuthRouter = require("./routes/auth.routes");
const createBooksRouter = require("./routes/books.routes");
const createCategoriesRouter = require("./routes/categories.routes");
const createAudioRateLimiter = require("./services/audio-rate-limiter");
const createR2AudioStorage = require("./services/r2-audio-storage");

function allowedOrigins(env = process.env) {
  return String(env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function credentialedOrigin(env = process.env) {
  const origins = allowedOrigins(env);
  return (origin, callback) => {
    callback(null, !origin || origins.includes(origin) ? origin || false : false);
  };
}

function createAudioCors(env = process.env) {
  return cors({
    origin: credentialedOrigin(env),
    credentials: true,
    methods: ["GET", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Range",
      "If-None-Match",
      "If-Modified-Since",
      "If-Range",
      "Content-Type",
    ],
    exposedHeaders: [
      "Accept-Ranges",
      "Content-Length",
      "Content-Range",
      "ETag",
      "Last-Modified",
    ],
    maxAge: 600,
  });
}

function createAuthCors(env = process.env) {
  return cors({
    origin: credentialedOrigin(env),
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 600,
  });
}

function createApp({
  database = defaultDatabase,
  audioStorage,
  audiobooksRepository,
  audiobookSecurity,
  authenticateRequest,
  audioAccessPolicy,
  audioRateLimiter = createAudioRateLimiter(),
  audioCors,
  authEnv = process.env,
} = {}) {
  const app = express();
  const booksRepository = createBooksRepository(database);
  const categoriesRepository = createCategoriesRepository(database);
  const authRepository = createAuthRepository(database);
  const booksController = createBooksController(booksRepository);
  const categoriesController = createCategoriesController(categoriesRepository);
  const authController = createAuthController(authRepository, { env: authEnv });

  const r2 = createR2ClientFromEnv();
  const storage = audioStorage || createR2AudioStorage(r2);
  const audioRepository =
    audiobooksRepository || createAudiobooksRepository(database);
  const security =
    audiobookSecurity || createAudiobookSecurity({ env: authEnv });
  const audioController = createAudiobooksController({
    repository: audioRepository,
    storage,
    accessPolicy: audioAccessPolicy || security.audioAccessPolicy,
    rateLimiter: audioRateLimiter,
  });

  const isProtectedRoute = (path) =>
    /^\/api\/auth(?:\/|$)/.test(path) ||
    /^\/api\/books\/[^/]+\/audio(?:\/|$)/.test(path);

  // Preserve wildcard CORS for the public catalog while credentials stay scoped.
  app.use((req, res, next) =>
    isProtectedRoute(req.path) ? next() : cors()(req, res, next),
  );
  app.use(express.json());
  app.use("/api/books", createBooksRouter(booksController));
  app.use(
    "/api/books",
    createAudiobooksRouter({
      controller: audioController,
      requireAuthenticatedUser: createRequireAuthenticatedUser(
        authenticateRequest || security.authenticateRequest,
      ),
      cors: audioCors || createAudioCors(authEnv),
    }),
  );
  app.use("/api/categories", createCategoriesRouter(categoriesController));
  app.use(
    "/api/auth",
    createAuthCors(authEnv),
    createAuthRouter(
      authController,
      createAuthMiddleware(
        createJwtAuthenticator({
          secret: authEnv.JWT_SECRET,
          cookieName: authEnv.AUDIO_SESSION_COOKIE_NAME || "daisy_session",
        }),
      ),
    ),
  );
  app.use(errorHandler);
  return app;
}

module.exports = { createApp, createAudioCors, createAuthCors };
