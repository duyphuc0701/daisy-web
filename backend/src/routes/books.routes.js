const express = require('express');

function createBooksRouter(booksController) {
  const router = express.Router();

  router.get('/', booksController.list);
  router.get('/:id', booksController.getById);

  return router;
}

module.exports = createBooksRouter;
