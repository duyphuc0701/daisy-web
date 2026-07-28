const dotenv = require("dotenv");
const { S3Client } = require("@aws-sdk/client-s3");
dotenv.config();
function createR2ClientFromEnv(env = process.env) {
  const required = [
    "CLOUDFLARE_S3_API",
    "CLOUDFLARE_S3_ACCESS_KEY_ID",
    "CLOUDFLARE_S3_SECRET_ACCESS_KEY",
    "CLOUDFLARE_S3_BUCKET_NAME",
    "CLOUDFLARE_S3_FOLDER_NAME",
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length)
    return { client: null, missing, bucket: null, prefix: "" };
  return {
    client: new S3Client({
      region: env.CLOUDFLARE_S3_REGION || "auto",
      endpoint: env.CLOUDFLARE_S3_API,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.CLOUDFLARE_S3_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_S3_SECRET_ACCESS_KEY,
      },
    }),
    missing: [],
    bucket: env.CLOUDFLARE_S3_BUCKET_NAME,
    prefix: normalizePrefix(env.CLOUDFLARE_S3_FOLDER_NAME),
  };
}
function normalizePrefix(value) {
  const normalized = String(value || "").replace(/^\/+|\/+$/g, "");
  return normalized ? `${normalized}/` : "";
}
module.exports = { createR2ClientFromEnv, normalizePrefix };
