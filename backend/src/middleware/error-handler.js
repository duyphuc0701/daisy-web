const ApiError = require("../errors/api-error");
const InternalServerError = require("../errors/internal-server-error");
function errorHandler(error, req, res, next) {
  if (error instanceof ApiError) {
    if (error.headers) res.set(error.headers);
    return res.status(error.status).json({ error: error.message });
  }
  // Preserve Express's native parsing/4xx response behavior for legacy routes.
  if (error.status && error.status < 500) return next(error);
  if (!(error instanceof InternalServerError))
    console.error("Unhandled request error:", error);
  return res.status(500).json({ error: "Internal server error" });
}
module.exports = errorHandler;
