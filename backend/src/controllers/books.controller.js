const InternalServerError = require('../errors/internal-server-error');

function createBooksController(booksRepository) {
  return {
    async list(req, res, next) {
      try {
        const books = await booksRepository.findAll(req.query);
        res.json(books);
      } catch (error) {
        console.error('Error fetching books:', error);
        next(new InternalServerError());
      }
    },

    async getById(req, res, next) {
      try {
        const book = await booksRepository.findById(req.params.id);

        if (!book) {
          return res.status(404).json({ error: 'Book not found' });
        }

        return res.json(book);
      } catch (error) {
        console.error('Error fetching book details:', error);
        return next(new InternalServerError());
      }
    },
  };
}

module.exports = createBooksController;
