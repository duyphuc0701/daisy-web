const express = require('express');

function createCategoriesRouter(categoriesController) {
  const router = express.Router();

  router.get('/', categoriesController.list);

  return router;
}

module.exports = createCategoriesRouter;
