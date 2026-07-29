const crypto = require("node:crypto");

const ARTIFACT_KIND = "daisy-audiobook-metadata";
const ARTIFACT_SCHEMA_VERSION = 1;
const REVISION_PATTERN = /^[a-f0-9]{64}$/;

function stableSerialize(value) {
  if (Array.isArray(value))
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(stableSerialize(value))
    .digest("hex");
}

function normalizePrefix(value) {
  const prefix = String(value || "").replace(/^\/+|\/+$/g, "");
  if (!prefix) throw new Error("Metadata artifact requires an R2 prefix");
  return `${prefix}/`;
}

function normalizeRevision(value, field) {
  const revision = String(value || "").trim().toLowerCase();
  if (!REVISION_PATTERN.test(revision))
    throw new Error(`Invalid ${field}`);
  return revision;
}

function normalizeNullableRevision(value, field) {
  if (value === undefined || value === null || value === "") return null;
  return normalizeRevision(value, field);
}

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error(`Invalid ${field}`);
  return number;
}

function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0)
    throw new Error(`Invalid ${field}`);
  return number;
}

function nullableNonNegativeInteger(value, field) {
  if (value === undefined || value === null) return null;
  return nonNegativeInteger(value, field);
}

function requiredString(value, field) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`Invalid ${field}`);
  return text;
}

function nullableString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeChapter(chapter, partNumber, index) {
  const sequence = positiveInteger(
    chapter?.sequence ?? index + 1,
    `chapter sequence for part ${partNumber}`,
  );
  if (sequence !== index + 1)
    throw new Error(
      `Chapter sequence for part ${partNumber} must be dense from 1`,
    );
  const startMs = nonNegativeInteger(
    chapter?.startMs ?? chapter?.start_ms,
    `chapter startMs for part ${partNumber}`,
  );
  const endMs = nullableNonNegativeInteger(
    chapter?.endMs ?? chapter?.end_ms,
    `chapter endMs for part ${partNumber}`,
  );
  if (endMs !== null && endMs < startMs)
    throw new Error(`Chapter endMs precedes startMs for part ${partNumber}`);
  return {
    sequence,
    title: requiredString(chapter?.title, `chapter title for part ${partNumber}`),
    startMs,
    endMs,
  };
}

function normalizePart(part, index, { prefix, revision }) {
  const partNumber = positiveInteger(
    part?.partNumber ?? part?.part_number,
    "partNumber",
  );
  if (partNumber !== index + 1)
    throw new Error("Audiobook part numbers must be dense from 1");
  const r2Key = requiredString(part?.r2Key ?? part?.r2_key, "part r2Key");
  const expectedRevisionSegment = `/revisions/${revision}/`;
  if (!r2Key.startsWith(prefix) || !r2Key.includes(expectedRevisionSegment))
    throw new Error(`Part ${partNumber} R2 key violates artifact revision`);
  const transcriptR2Key = nullableString(
    part?.transcriptR2Key ?? part?.transcript_r2_key,
  );
  if (
    transcriptR2Key &&
    (!transcriptR2Key.startsWith(prefix) ||
      !transcriptR2Key.includes(expectedRevisionSegment))
  )
    throw new Error(
      `Part ${partNumber} transcript R2 key violates artifact revision`,
    );
  const chapters = Array.isArray(part?.chapters)
    ? part.chapters.map((chapter, chapterIndex) =>
        normalizeChapter(chapter, partNumber, chapterIndex),
      )
    : [];
  return {
    partNumber,
    title: requiredString(part?.title, `part ${partNumber} title`),
    r2Key,
    mimeType: requiredString(
      part?.mimeType ?? part?.mime_type ?? "audio/mpeg",
      `part ${partNumber} mimeType`,
    ),
    durationMs: nonNegativeInteger(
      part?.durationMs ?? part?.duration_ms,
      `part ${partNumber} durationMs`,
    ),
    byteLength: nullableNonNegativeInteger(
      part?.byteLength ?? part?.byte_length,
      `part ${partNumber} byteLength`,
    ),
    etag: nullableString(part?.etag),
    lastModifiedAt: nullableString(
      part?.lastModifiedAt ?? part?.last_modified_at,
    ),
    language: requiredString(
      part?.language || "vi",
      `part ${partNumber} language`,
    ),
    narrator: nullableString(part?.narrator),
    transcriptR2Key,
    transcriptFormat: nullableString(
      part?.transcriptFormat ?? part?.transcript_format,
    ),
    chapters,
  };
}

function normalizeObject(object, index, { prefix, revision }) {
  const key = requiredString(object?.key, `object ${index + 1} key`);
  if (
    !key.startsWith(prefix) ||
    !key.includes(`/revisions/${revision}/`)
  )
    throw new Error(`Object ${index + 1} key violates artifact revision`);
  const sha256 = normalizeRevision(
    object?.sha256,
    `object ${index + 1} sha256`,
  );
  const objectRevision = normalizeRevision(
    object?.revision,
    `object ${index + 1} revision`,
  );
  if (objectRevision !== revision)
    throw new Error(`Object ${index + 1} revision mismatch`);
  return {
    key,
    revision: objectRevision,
    sha256,
    contentType: requiredString(
      object?.contentType ?? object?.content_type,
      `object ${index + 1} contentType`,
    ),
    contentLength: nonNegativeInteger(
      object?.contentLength ?? object?.content_length,
      `object ${index + 1} contentLength`,
    ),
  };
}

function normalizeBook(book, { prefix }) {
  const bookId = positiveInteger(
    book?.bookId ?? book?.book_id,
    "bookId",
  );
  const revision = normalizeRevision(
    book?.revision,
    `revision for book ${bookId}`,
  );
  const parts = Array.isArray(book?.parts)
    ? book.parts.map((part, index) =>
        normalizePart(part, index, { prefix, revision }),
      )
    : [];
  if (!parts.length)
    throw new Error(`Book ${bookId} metadata contains no parts`);
  const objects = Array.isArray(book?.objects)
    ? book.objects.map((object, index) =>
        normalizeObject(object, index, { prefix, revision }),
      )
    : [];
  if (!objects.length)
    throw new Error(`Book ${bookId} metadata contains no R2 objects`);
  const objectKeys = new Set();
  for (const object of objects) {
    if (objectKeys.has(object.key))
      throw new Error(`Duplicate metadata object key: ${object.key}`);
    objectKeys.add(object.key);
  }
  for (const part of parts) {
    if (!objectKeys.has(part.r2Key))
      throw new Error(
        `Book ${bookId} part ${part.partNumber} audio object is absent`,
      );
    if (part.transcriptR2Key && !objectKeys.has(part.transcriptR2Key))
      throw new Error(
        `Book ${bookId} part ${part.partNumber} transcript object is absent`,
      );
  }
  return {
    bookId,
    slug: requiredString(book?.slug, `slug for book ${bookId}`),
    title: requiredString(book?.title, `title for book ${bookId}`),
    revision,
    expectedPriorRevision: normalizeNullableRevision(
      book?.expectedPriorRevision ?? book?.expected_prior_revision,
      `expectedPriorRevision for book ${bookId}`,
    ),
    objects,
    parts,
  };
}

function summarize(books) {
  return {
    books: books.length,
    parts: books.reduce((total, book) => total + book.parts.length, 0),
    chapters: books.reduce(
      (total, book) =>
        total +
        book.parts.reduce(
          (partTotal, part) => partTotal + part.chapters.length,
          0,
        ),
      0,
    ),
    objects: books.reduce(
      (total, book) => total + book.objects.length,
      0,
    ),
    bytes: books.reduce(
      (total, book) =>
        total +
        book.objects.reduce(
          (bookTotal, object) => bookTotal + object.contentLength,
          0,
        ),
      0,
    ),
  };
}

function artifactPayload({
  manifestDigest,
  r2Prefix,
  books,
}) {
  const prefix = normalizePrefix(r2Prefix);
  const normalizedBooks = books.map((book) =>
    normalizeBook(book, { prefix }),
  );
  const bookIds = new Set();
  const slugs = new Set();
  for (const book of normalizedBooks) {
    if (bookIds.has(book.bookId))
      throw new Error(`Duplicate metadata bookId: ${book.bookId}`);
    if (slugs.has(book.slug))
      throw new Error(`Duplicate metadata slug: ${book.slug}`);
    bookIds.add(book.bookId);
    slugs.add(book.slug);
  }
  return {
    kind: ARTIFACT_KIND,
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    manifestDigest: normalizeRevision(manifestDigest, "manifestDigest"),
    r2Prefix: prefix,
    summary: summarize(normalizedBooks),
    books: normalizedBooks,
  };
}

function createMetadataArtifact(input) {
  const payload = artifactPayload(input);
  return {
    ...payload,
    artifactDigest: digest(payload),
  };
}

function validateMetadataArtifact(document, { expectedPrefix } = {}) {
  if (!document || typeof document !== "object")
    throw new Error("Audiobook metadata artifact must be an object");
  if (document.kind !== ARTIFACT_KIND)
    throw new Error(`Unsupported metadata artifact kind: ${document.kind}`);
  if (document.schemaVersion !== ARTIFACT_SCHEMA_VERSION)
    throw new Error(
      `Unsupported metadata artifact schemaVersion: ${document.schemaVersion}`,
    );
  const payload = artifactPayload(document);
  if (
    stableSerialize(document.summary) !== stableSerialize(payload.summary)
  )
    throw new Error("Audiobook metadata artifact summary mismatch");
  const actualDigest = normalizeRevision(
    document.artifactDigest,
    "artifactDigest",
  );
  const expectedDigest = digest(payload);
  if (actualDigest !== expectedDigest)
    throw new Error("Audiobook metadata artifact digest mismatch");
  if (
    expectedPrefix !== undefined &&
    payload.r2Prefix !== normalizePrefix(expectedPrefix)
  )
    throw new Error(
      `Audiobook metadata R2 prefix mismatch: ${payload.r2Prefix}`,
    );
  return {
    ...payload,
    artifactDigest: actualDigest,
  };
}

module.exports = {
  ARTIFACT_KIND,
  ARTIFACT_SCHEMA_VERSION,
  createMetadataArtifact,
  digest,
  stableSerialize,
  summarize,
  validateMetadataArtifact,
};
