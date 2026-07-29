const { createSessionAuthenticator } = require("./auth");
const createAudiobookAccessPolicy = require("../services/audiobook-access-policy");

const DEVELOPMENT_PRINCIPAL = Object.freeze({
  id: "audiobook-development-user",
  roles: Object.freeze(["audiobook-development"]),
});

function parseDevelopmentBypass(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "false") return false;
  if (normalized === "true") return true;

  throw new Error("AUDIO_DEV_BYPASS_AUTH must be true or false");
}

function createAudiobookSecurity({ env = process.env } = {}) {
  const bypassEnabled = parseDevelopmentBypass(
    env.AUDIO_DEV_BYPASS_AUTH,
  );

  if (bypassEnabled && env.NODE_ENV !== "development") {
    throw new Error(
      "AUDIO_DEV_BYPASS_AUTH is allowed only when NODE_ENV=development",
    );
  }

  if (bypassEnabled) {
    return {
      authenticateRequest: async () => DEVELOPMENT_PRINCIPAL,
      audioAccessPolicy: createAudiobookAccessPolicy({
        canAccess: async (principal) =>
          principal?.id === DEVELOPMENT_PRINCIPAL.id,
      }),
    };
  }

  return {
    authenticateRequest: createSessionAuthenticator({
      secret: env.AUDIO_SESSION_SECRET,
      cookieName: env.AUDIO_SESSION_COOKIE_NAME || "daisy_session",
    }),
    audioAccessPolicy: createAudiobookAccessPolicy(),
  };
}

module.exports = {
  DEVELOPMENT_PRINCIPAL,
  createAudiobookSecurity,
  parseDevelopmentBypass,
};
