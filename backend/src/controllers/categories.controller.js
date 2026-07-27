const InternalServerError = require('../errors/internal-server-error');

function createCategoriesController(categoriesRepository) {
  return {
    async list(req, res, next) {
      try {
        const categories = await categoriesRepository.findAll();
        res.json(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        next(new InternalServerError());
      }
    },
  };
}

module.exports = createCategoriesController;
