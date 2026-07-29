const { HeadObjectCommand } = require("@aws-sdk/client-s3");

function createR2MetadataReader({ client, bucket, prefix = "" } = {}) {
  if (!client) throw new TypeError("createR2MetadataReader requires a client");
  if (!bucket) throw new TypeError("createR2MetadataReader requires a bucket");

  async function head(key) {
    if (!key) throw new TypeError("R2 object key is required");
    if (prefix && !key.startsWith(prefix))
      throw new Error(`R2 object key must remain inside prefix ${prefix}`);
    try {
      const response = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return normalizeHead(response);
    } catch (error) {
      if (isMissingObjectError(error)) return null;
      throw error;
    }
  }

  return { bucket, prefix, head };
}

function normalizeHead(response) {
  return {
    contentLength:
      response?.ContentLength === undefined
        ? null
        : Number(response.ContentLength),
    contentType: response?.ContentType || null,
    etag: response?.ETag || null,
    lastModified: response?.LastModified || null,
    metadata: Object.fromEntries(
      Object.entries(response?.Metadata || {}).map(([key, value]) => [
        String(key).toLowerCase(),
        value == null ? "" : String(value),
      ]),
    ),
  };
}

function verifyObjectMetadata(actual, expected) {
  if (!actual)
    return {
      ok: false,
      reason: "missing",
      expected: summarizeExpected(expected),
    };
  const mismatches = {};
  if (actual.metadata.sha256 !== expected.sha256)
    mismatches.sha256 = {
      expected: expected.sha256,
      actual: actual.metadata.sha256 || null,
    };
  if (actual.metadata.revision !== expected.revision)
    mismatches.revision = {
      expected: expected.revision,
      actual: actual.metadata.revision || null,
    };
  if (
    expected.contentLength !== null &&
    actual.contentLength !== expected.contentLength
  )
    mismatches.contentLength = {
      expected: expected.contentLength,
      actual: actual.contentLength,
    };
  if (
    expected.contentType &&
    actual.contentType !== expected.contentType
  )
    mismatches.contentType = {
      expected: expected.contentType,
      actual: actual.contentType,
    };
  return {
    ok: Object.keys(mismatches).length === 0,
    key: expected.key,
    mismatches,
    actual,
    expected: summarizeExpected(expected),
  };
}

function summarizeExpected(expected) {
  return {
    key: expected.key,
    revision: expected.revision,
    sha256: expected.sha256,
    contentType: expected.contentType,
    contentLength: expected.contentLength,
  };
}

function isMissingObjectError(error) {
  return (
    error?.name === "NotFound" ||
    error?.name === "NoSuchKey" ||
    error?.Code === "NotFound" ||
    error?.code === "NotFound" ||
    error?.$metadata?.httpStatusCode === 404
  );
}

module.exports = {
  createR2MetadataReader,
  isMissingObjectError,
  normalizeHead,
  verifyObjectMetadata,
};
