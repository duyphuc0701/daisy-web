const ApiError = require("../errors/api-error");
function createRequireAuthenticatedUser(authenticateRequest) {
  return async (req, _res, next) => {
    try {
      const principal = await authenticateRequest(req);
      if (!principal || typeof principal.id !== "string" || !principal.id)
        throw new ApiError(401, "Authentication is required");
      req.auth = {
        id: principal.id,
        roles: Array.isArray(principal.roles) ? principal.roles : [],
      };
      next();
    } catch (error) {
      next(
        error instanceof ApiError
          ? error
          : new ApiError(401, "Authentication is required"),
      );
    }
  };
}
module.exports = createRequireAuthenticatedUser;
