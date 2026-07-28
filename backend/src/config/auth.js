const crypto = require("crypto");
function createSessionAuthenticator({
  secret = process.env.AUDIO_SESSION_SECRET,
  cookieName = process.env.AUDIO_SESSION_COOKIE_NAME || "daisy_session",
} = {}) {
  return async (req) => {
    if (!secret) return null;
    const token = parseCookies(req.headers.cookie || "")[cookieName];
    if (!token) return null;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(encoded)
      .digest("base64url");
    const supplied = Buffer.from(signature);
    const trusted = Buffer.from(expected);
    if (
      supplied.length !== trusted.length ||
      !crypto.timingSafeEqual(supplied, trusted)
    )
      return null;
    try {
      const payload = JSON.parse(
        Buffer.from(encoded, "base64url").toString("utf8"),
      );
      if (
        !payload ||
        typeof payload.sub !== "string" ||
        !Number.isSafeInteger(payload.exp) ||
        payload.exp <= Math.floor(Date.now() / 1000)
      )
        return null;
      return {
        id: payload.sub,
        roles: Array.isArray(payload.roles)
          ? payload.roles.filter((role) => typeof role === "string")
          : [],
      };
    } catch {
      return null;
    }
  };
}
function parseCookies(header) {
  return header.split(";").reduce((cookies, piece) => {
    const index = piece.indexOf("=");
    if (index > 0)
      cookies[piece.slice(0, index).trim()] = decodeURIComponent(
        piece.slice(index + 1).trim(),
      );
    return cookies;
  }, {});
}
module.exports = { createSessionAuthenticator };
