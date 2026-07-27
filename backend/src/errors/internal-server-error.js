class InternalServerError extends Error {
  constructor() {
    super('Internal server error');
    this.name = 'InternalServerError';
  }
}

module.exports = InternalServerError;
