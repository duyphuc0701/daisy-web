const dotenv = require("dotenv");
const { S3Client } = require("@aws-sdk/client-s3");
dotenv.config();

const DEFAULT_REGION = "auto";

function createS3Client({ endpoint, accessKeyId, secretAccessKey, region }) {
  return new S3Client({
    region: region || DEFAULT_REGION,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

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
    client: createS3Client({
      region: env.CLOUDFLARE_S3_REGION || DEFAULT_REGION,
      endpoint: env.CLOUDFLARE_S3_API,
      accessKeyId: env.CLOUDFLARE_S3_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_S3_SECRET_ACCESS_KEY,
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

module.exports = {
  createR2ClientFromEnv,
  normalizePrefix,
};
