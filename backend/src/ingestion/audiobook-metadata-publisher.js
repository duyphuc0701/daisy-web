const {
  createAudiobookPublisher,
} = require("./audiobook-publisher");
const {
  verifyObjectMetadata,
} = require("./r2-metadata-reader");

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function validateTargetBook(database, book) {
  const [rows] = await database.query(
    "SELECT id, title FROM books WHERE id = ?",
    [book.bookId],
  );
  const row = rows[0] || null;
  if (!row) throw new Error(`Target DB is missing book ${book.bookId}`);
  if (normalizeTitle(row.title) !== normalizeTitle(book.title))
    throw new Error(
      `Target DB title mismatch for book ${book.bookId}: ${row.title} !== ${book.title}`,
    );
  return row;
}

async function concurrentMap(items, concurrency, callback) {
  const values = Array.from(items || []);
  const results = new Array(values.length);
  let index = 0;
  let failure = null;

  async function worker() {
    while (!failure) {
      const current = index;
      index += 1;
      if (current >= values.length) return;
      try {
        results[current] = await callback(values[current], current);
      } catch (error) {
        failure ||= error;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), values.length) },
      () => worker(),
    ),
  );
  if (failure) throw failure;
  return results;
}

async function verifyBookObjects(storage, book, concurrency) {
  const results = await concurrentMap(
    book.objects,
    concurrency,
    async (object) => {
      let actual;
      try {
        actual = await storage.head(object.key);
      } catch (error) {
        const status = error?.$metadata?.httpStatusCode;
        const detail =
          error?.message && error.message !== "UnknownError"
            ? error.message
            : error?.name || "unknown storage error";
        throw new Error(
          `R2 HEAD failed for ${object.key}${
            status ? ` (HTTP ${status})` : ""
          }: ${detail}`,
          { cause: error },
        );
      }
      const verification = verifyObjectMetadata(actual, object);
      if (!verification.ok)
        throw new Error(
          `R2 metadata verification failed for ${object.key}: ${JSON.stringify(
            verification.mismatches || verification.reason,
          )}`,
        );
      return verification.actual;
    },
  );
  return new Map(
    book.objects.map((object, index) => [object.key, results[index]]),
  );
}

function publisherParts(book, metadataByKey) {
  return book.parts.map((part) => {
    const metadata = metadataByKey.get(part.r2Key);
    return {
      ...part,
      byteLength: metadata?.contentLength ?? part.byteLength,
      etag: metadata?.etag ?? part.etag,
      lastModifiedAt: metadata?.lastModified ?? part.lastModifiedAt,
    };
  });
}

function reconcilePublication(book, publication) {
  if (!publication.exists)
    throw new Error(`Publication missing for book ${book.bookId}`);
  if (publication.revision !== book.revision)
    throw new Error(`Publication revision mismatch for book ${book.bookId}`);
  if (publication.parts.length !== book.parts.length)
    throw new Error(`Published part count mismatch for book ${book.bookId}`);
  const expectedChapters = book.parts.reduce(
    (total, part) => total + part.chapters.length,
    0,
  );
  const actualChapters = publication.parts.reduce(
    (total, part) => total + (part.chapters?.length || 0),
    0,
  );
  if (actualChapters !== expectedChapters)
    throw new Error(`Published chapter count mismatch for book ${book.bookId}`);
  return publication;
}

async function publishMetadataArtifact({
  artifact,
  database,
  storage,
  concurrency = 4,
  publisher = createAudiobookPublisher(database),
  onBook,
} = {}) {
  if (!artifact?.books?.length)
    throw new Error("Validated audiobook metadata artifact is required");
  if (!database) throw new Error("Database is required");
  if (!storage) throw new Error("Read-only R2 storage is required");

  const results = [];
  for (const book of artifact.books) {
    await validateTargetBook(database, book);
    const metadataByKey = await verifyBookObjects(
      storage,
      book,
      concurrency,
    );
    const current = await publisher.reconcile(book.bookId);
    if (current.revision === book.revision) {
      const publication = reconcilePublication(book, current);
      const result = {
        bookId: book.bookId,
        slug: book.slug,
        status: "already_published",
        revision: book.revision,
        parts: publication.parts.length,
        chapters: book.parts.reduce(
          (total, part) => total + part.chapters.length,
          0,
        ),
        objects: book.objects.length,
      };
      results.push(result);
      if (onBook) await onBook(result);
      continue;
    }
    if (current.revision !== book.expectedPriorRevision)
      throw new Error(
        `Publication fence is stale for book ${book.bookId}: expected ${
          book.expectedPriorRevision || "null"
        }, current ${current.revision || "null"}`,
      );
    const published = await publisher.publish({
      bookId: book.bookId,
      revision: book.revision,
      expectedPriorRevision: book.expectedPriorRevision,
      parts: publisherParts(book, metadataByKey),
    });
    if (published.status !== "published")
      throw new Error(
        `Unexpected publication status for book ${book.bookId}: ${published.status}`,
      );
    const publication = reconcilePublication(
      book,
      await publisher.reconcile(book.bookId),
    );
    const result = {
      bookId: book.bookId,
      slug: book.slug,
      status: "published",
      revision: book.revision,
      parts: publication.parts.length,
      chapters: book.parts.reduce(
        (total, part) => total + part.chapters.length,
        0,
      ),
      objects: book.objects.length,
    };
    results.push(result);
    if (onBook) await onBook(result);
  }
  return results;
}

module.exports = {
  concurrentMap,
  normalizeTitle,
  publishMetadataArtifact,
  publisherParts,
  reconcilePublication,
  validateTargetBook,
  verifyBookObjects,
};
