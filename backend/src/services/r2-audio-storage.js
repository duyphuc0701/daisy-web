const { GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const ApiError = require("../errors/api-error");
function createR2AudioStorage({ client, bucket, prefix = "" } = {}) {
  function keyFor(key) {
    if (!client || !bucket)
      throw new ApiError(503, "Audiobook streaming is not configured");
    if (!key || !prefix || !key.startsWith(prefix))
      throw new ApiError(404, "Audiobook not found");
    return key;
  }
  function normalize(object) {
    return {
      body: object.Body,
      contentLength: Number(object.ContentLength),
      contentType: object.ContentType || "audio/mpeg",
      etag: object.ETag,
      lastModified: object.LastModified,
      contentRange: object.ContentRange,
      notModified: object.$metadata?.httpStatusCode === 304,
    };
  }
  return {
    async head(key) {
      return normalize(
        await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: keyFor(key) }),
        ),
      );
    },
    async get(key, { range, ifNoneMatch, ifModifiedSince } = {}) {
      return normalize(
        await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: keyFor(key),
            ...(range ? { Range: range } : {}),
            ...(ifNoneMatch ? { IfNoneMatch: ifNoneMatch } : {}),
            ...(ifModifiedSince ? { IfModifiedSince: ifModifiedSince } : {}),
          }),
        ),
      );
    },
    async getTranscript(key) {
      const object = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: keyFor(key) }),
      );
      return {
        text: await object.Body.transformToString("utf8"),
        contentType: object.ContentType || "text/plain; charset=utf-8",
      };
    },
  };
}
module.exports = createR2AudioStorage;
