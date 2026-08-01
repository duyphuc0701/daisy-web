const { pipeline } = require("node:stream/promises");
const ApiError = require("../errors/api-error");
const { parseSingleRange } = require("../utils/byte-range");
function createAudiobooksController({
  repository,
  storage,
  accessPolicy,
  rateLimiter,
}) {
  async function authorize(req, bookId) {
    if (!Number.isSafeInteger(bookId) || bookId <= 0)
      throw new ApiError(400, "Book id must be a positive integer");
    if (!(await accessPolicy.canAccess(req.auth, bookId)))
      throw new ApiError(403, "You are not permitted to access this audiobook");
  }
  async function partFor(req) {
    const bookId = Number(req.params.bookId);
    const partId = Number(req.params.audioId);
    await authorize(req, bookId);
    if (!Number.isSafeInteger(partId) || partId <= 0)
      throw new ApiError(400, "Audio id must be a positive integer");
    const part = await repository.findPart(bookId, partId);
    if (!part) throw new ApiError(404, "Audiobook not found");
    return part;
  }
  function setHeaders(res, object, { range } = {}) {
    res.set({
      "Accept-Ranges": "bytes",
      "Content-Type": object.contentType || "audio/mpeg",
      "Content-Length": String(range ? range.length : object.contentLength),
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin, Cookie, Authorization",
    });
    if (object.etag) res.set("ETag", object.etag);
    if (object.lastModified)
      res.set("Last-Modified", new Date(object.lastModified).toUTCString());
    if (range)
      res.set(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${object.contentLength}`,
      );
  }
  function conditionalNotModified(req, metadata) {
    if (req.headers["if-none-match"])
      return Boolean(
        metadata.etag && req.headers["if-none-match"] === metadata.etag,
      );
    const modifiedSince = req.headers["if-modified-since"];
    return Boolean(
      modifiedSince &&
        metadata.lastModified &&
        new Date(metadata.lastModified) <= new Date(modifiedSince),
    );
  }
  function rangeAllowed(req, metadata) {
    const ifRange = req.headers["if-range"];
    if (!ifRange) return true;
    if (metadata.etag && ifRange === metadata.etag) return true;
    const date = new Date(ifRange);
    return (
      !Number.isNaN(date.valueOf()) &&
      metadata.lastModified &&
      new Date(metadata.lastModified) <= date
    );
  }
  function upstream(error) {
    if (error instanceof ApiError) return error;
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404)
      return new ApiError(404, "Audiobook not found");
    return new ApiError(503, "Audiobook streaming is temporarily unavailable");
  }
  return {
    async discover(req, res, next) {
      try {
        const bookId = Number(req.params.bookId);
        await authorize(req, bookId);
        const catalog = await repository.findCatalog(bookId);
        if (!catalog) throw new ApiError(404, "Audiobook not found");
        const chaptersByPart = new Map();
        for (const chapter of catalog.chapters)
          chaptersByPart.set(chapter.part_id, [
            ...(chaptersByPart.get(chapter.part_id) || []),
            {
              id: chapter.id,
              title: chapter.title,
              startMs: chapter.start_ms,
              endMs: chapter.end_ms,
            },
          ]);
        const parts = catalog.parts.map((part) => ({
          id: part.id,
          partNumber: part.part_number,
          title: part.title,
          durationMs: part.duration_ms,
          mimeType: part.mime_type,
          language: part.language,
          narrator: part.narrator,
          streamUrl: `/api/books/${bookId}/audio/${part.id}/stream`,
          transcriptUrl: part.transcript_r2_key
            ? `/api/books/${bookId}/audio/${part.id}/transcript`
            : null,
          chapters: chaptersByPart.get(part.id) || [],
        }));
        res.json({
          bookId,
          title: catalog.book.title,
          language: parts[0].language,
          narrator: parts[0].narrator,
          totalDurationMs: parts.reduce(
            (total, part) => total + (part.durationMs || 0),
            0,
          ),
          parts,
        });
      } catch (error) {
        next(upstream(error));
      }
    },
    async stream(req, res, next) {
      let lease;
      try {
        lease = rateLimiter.acquire({ userId: req.auth.id, ip: req.ip });
        if (!lease.allowed)
          throw new ApiError(429, "Too many audio stream requests", {
            headers: { "Retry-After": String(lease.retryAfter) },
          });
        res.once("close", () => lease.release());
        const part = await partFor(req);
        const metadata = await storage.head(part.r2_key);
        if (conditionalNotModified(req, metadata)) {
          setHeaders(res, metadata);
          return res.status(304).end();
        }
        const requested = rangeAllowed(req, metadata)
          ? parseSingleRange(req.headers.range, metadata.contentLength)
          : null;
        if (req.method === "HEAD") {
          setHeaders(res, metadata, { range: requested });
          return res.status(requested ? 206 : 200).end();
        }
        const object = await storage.get(part.r2_key, {
          range: requested?.header,
          ifNoneMatch: req.headers["if-none-match"],
          ifModifiedSince: req.headers["if-modified-since"],
        });
        res.once("close", () => {
          if (
            !object.body.destroyed &&
            typeof object.body.destroy === "function"
          )
            object.body.destroy();
        });
        setHeaders(
          res,
          { ...metadata, ...object, contentLength: metadata.contentLength },
          { range: requested },
        );
        res.status(requested ? 206 : 200);
        await pipeline(object.body, res);
      } catch (error) {
        if (lease?.allowed && typeof lease.release === "function")
          lease.release();
        if (!res.headersSent) next(upstream(error));
        else res.destroy(error);
      }
    },
    async transcript(req, res, next) {
      try {
        const part = await partFor(req);
        const format = req.query.format || "json";
        if (!["json", "text"].includes(format))
          throw new ApiError(400, "Transcript format must be json or text");
        if (!part.transcript_r2_key)
          throw new ApiError(404, "Transcript not found");
        const transcript = await storage.getTranscript(part.transcript_r2_key);
        if (format === "text")
          return res.type("text/plain").send(transcript.text);
        const parsed = JSON.parse(transcript.text);
        if (
          !Array.isArray(parsed.segments) ||
          parsed.segments.some(
            (segment, index, all) =>
              !Number.isSafeInteger(segment.startMs) ||
              !Number.isSafeInteger(segment.endMs) ||
              segment.startMs > segment.endMs ||
              (index && segment.startMs < all[index - 1].startMs),
          )
        )
          throw new ApiError(502, "Transcript metadata is invalid");
        return res.json({
          language: part.language,
          format: "timed-text",
          segments: parsed.segments,
        });
      } catch (error) {
        next(upstream(error));
      }
    },
  };
}
module.exports = createAudiobooksController;
