const cors = require('cors');
const express = require('express');

const defaultDatabase = require('./config/database');
const createBooksController = require('./controllers/books.controller');
const createCategoriesController = require('./controllers/categories.controller');
const errorHandler = require('./middleware/error-handler');
const createBooksRepository = require('./repositories/books.repository');
const createCategoriesRepository = require('./repositories/categories.repository');
const createAuthRepository = require('./repositories/auth.repository');

const createBooksRouter = require('./routes/books.routes');
const createCategoriesRouter = require('./routes/categories.routes');
const createAuthRouter = require('./routes/auth.routes');
const authMiddleware = require('./middleware/auth.middleware');
const createAuthController = require('./controllers/auth.controller');

function createApp({ database = defaultDatabase } = {}) {
  const app = express();

  const booksRepository = createBooksRepository(database);
  const categoriesRepository = createCategoriesRepository(database);
  const authRepository = createAuthRepository(database);

  const booksController = createBooksController(booksRepository);
  const categoriesController = createCategoriesController(categoriesRepository);
  const authController = createAuthController(authRepository);

  app.use(cors());
  app.use(express.json());

  app.use('/api/books', createBooksRouter(booksController));
  app.use('/api/categories', createCategoriesRouter(categoriesController));
  app.use('/api/auth', createAuthRouter(authController, authMiddleware));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
