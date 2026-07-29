const cors = require("cors");
const express = require("express");

const defaultDatabase = require("./config/database");
const { createR2ClientFromEnv } = require("./config/r2");
const {
  createAudiobookSecurity,
} = require("./config/audiobook-security");
const createAudiobooksController = require("./controllers/audiobooks.controller");
const createBooksController = require("./controllers/books.controller");
const createCategoriesController = require("./controllers/categories.controller");
const errorHandler = require("./middleware/error-handler");
const createRequireAuthenticatedUser = require("./middleware/require-authenticated-user");
const createAudiobooksRepository = require("./repositories/audiobooks.repository");
const createBooksRepository = require("./repositories/books.repository");
const createCategoriesRepository = require("./repositories/categories.repository");
const createAudiobooksRouter = require("./routes/audiobooks.routes");
const createBooksRouter = require("./routes/books.routes");
const createCategoriesRouter = require("./routes/categories.routes");
const createAudioRateLimiter = require("./services/audio-rate-limiter");
const createR2AudioStorage = require("./services/r2-audio-storage");

function createAudioCors(
  allowedOrigins = String(
    process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
) {
  return cors({
    origin(origin, callback) {
      callback(
        null,
        !origin || allowedOrigins.includes(origin) ? origin || false : false,
      );
    },
    credentials: true,
    methods: ["GET", "HEAD", "OPTIONS"],
    allowedHeaders: [
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

function createApp({
  database = defaultDatabase,
  audioStorage,
  audiobooksRepository,
  audiobookSecurity = createAudiobookSecurity(),
  authenticateRequest = audiobookSecurity.authenticateRequest,
  audioAccessPolicy = audiobookSecurity.audioAccessPolicy,
  audioRateLimiter = createAudioRateLimiter(),
  audioCors = createAudioCors(),
} = {}) {
  const app = express();
  const booksRepository = createBooksRepository(database);
  const categoriesRepository = createCategoriesRepository(database);
  const booksController = createBooksController(booksRepository);
  const categoriesController = createCategoriesController(categoriesRepository);
  const r2 = createR2ClientFromEnv();
  const storage = audioStorage || createR2AudioStorage(r2);
  const audioRepository =
    audiobooksRepository || createAudiobooksRepository(database);
  const audioController = createAudiobooksController({
    repository: audioRepository,
    storage,
    accessPolicy: audioAccessPolicy,
    rateLimiter: audioRateLimiter,
  });

  // Preserve existing catalog CORS while keeping credentialed audio routes off wildcard CORS.
  app.use((req, res, next) =>
    /^\/api\/books\/[^/]+\/audio(?:\/|$)/.test(req.path)
      ? next()
      : cors()(req, res, next),
  );
  app.use(express.json());
  app.use("/api/books", createBooksRouter(booksController));
  app.use(
    "/api/books",
    createAudiobooksRouter({
      controller: audioController,
      requireAuthenticatedUser:
        createRequireAuthenticatedUser(authenticateRequest),
      cors: audioCors,
    }),
  );
  app.use("/api/categories", createCategoriesRouter(categoriesController));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp, createAudioCors };
