const InternalServerError = require('../errors/internal-server-error');

function errorHandler(error, req, res, next) {
  if (error.status && error.status < 500) {
    return next(error);
  }

  if (!(error instanceof InternalServerError)) {
    console.error('Unhandled request error:', error);
  }

  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
