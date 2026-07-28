class ApiError extends Error {
  constructor(status, message, { headers } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.headers = headers;
  }
}
module.exports = ApiError;
