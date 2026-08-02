const { createJwtAuthenticator } = require("../config/auth");

function createAuthMiddleware(authenticateRequest = createJwtAuthenticator()) {
  return async (req, res, next) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ error: "Không tìm thấy token xác thực" });
      }

      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
    }
  };
}

module.exports = createAuthMiddleware();
module.exports.createAuthMiddleware = createAuthMiddleware;
