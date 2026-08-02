const jwt = require("jsonwebtoken");

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, piece) => {
    const index = piece.indexOf("=");
    if (index <= 0) return cookies;

    const name = piece.slice(0, index).trim();
    const value = piece.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      // Ignore malformed cookies and fail authentication closed.
    }
    return cookies;
  }, {});
}

function tokenFromRequest(req, cookieName) {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string") {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match) return match[1];
  }

  return parseCookies(req.headers.cookie)[cookieName] || null;
}

function createJwtAuthenticator({
  secret = process.env.JWT_SECRET,
  cookieName = process.env.AUDIO_SESSION_COOKIE_NAME || "daisy_session",
} = {}) {
  return async (req) => {
    if (!secret) return null;

    const token = tokenFromRequest(req, cookieName);
    if (!token) return null;

    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      const subject = payload.id ?? payload.sub;
      if (subject === undefined || subject === null || subject === "") return null;

      return {
        id: String(subject),
        username:
          typeof payload.username === "string" ? payload.username : undefined,
        roles: Array.isArray(payload.roles)
          ? payload.roles.filter((role) => typeof role === "string")
          : [],
      };
    } catch {
      return null;
    }
  };
}

module.exports = { createJwtAuthenticator, parseCookies, tokenFromRequest };
