const crypto = require("node:crypto")

const DEADLOCK_CODES = new Set(["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"])
const DUPLICATE_CODES = new Set(["ER_DUP_ENTRY"])
const DEFAULT_MAX_RETRIES = 3
const REVISION_PATTERN = /^[a-f0-9]{64}$/i

function createAudiobookPublisher(database, options = {}) {
  if (!database) throw new Error("A MySQL pool or connection is required")

  const maxRetries = Number.isSafeInteger(options.maxRetries)
    ? options.maxRetries
    : DEFAULT_MAX_RETRIES
  const now = typeof options.now === "function" ? options.now : () => new Date()

  return {
    publish(command) {
      return withRetries(() =>
        withTransaction(database, async (connection) => {
          const desired = normalizeCommand(command)
          const lock = await lockPublication(connection, desired.bookId)
          const current = await loadPublishedSnapshot(connection, desired.bookId)
          const decision = decidePublish(lock.revision, desired.expectedPriorRevision, desired.revision)

          if (decision !== "apply") {
            return buildOutcome(decision, desired.bookId, lock, current)
          }

          const publishedAt = now()
          const snapshot = serializeSnapshot(current)
          const result = await applyPublication(connection, {
            bookId: desired.bookId,
            desired,
            current,
            publishedAt,
          })

          await updatePublicationLock(connection, desired.bookId, {
            revision: desired.revision,
            rollbackRevision: lock.revision,
            rollbackSnapshot: snapshot,
            publishedPartIds: result.publishedPartIds,
          })

          return {
            status: "published",
            bookId: desired.bookId,
            revision: desired.revision,
            previousRevision: lock.revision,
            rollbackRevision: lock.revision,
            publishedAt,
            publishedPartIds: result.publishedPartIds,
            stalePartIds: result.stalePartIds,
            parts: result.parts,
          }
        }),
      maxRetries)
    },

    rollback(command) {
      return withRetries(() =>
        withTransaction(database, async (connection) => {
          const desired = normalizeRollback(command)
          const lock = await lockPublication(connection, desired.bookId)
          const current = await loadPublishedSnapshot(connection, desired.bookId)

          if (lock.revision === null) {
            return buildOutcome("missing", desired.bookId, lock, current)
          }
          if (desired.revision !== lock.revision) {
            return buildOutcome("stale", desired.bookId, lock, current)
          }

          const previous = deserializeSnapshot(lock.rollback_snapshot)
          const publishedAt = now()
          const restored = await restoreSnapshot(connection, {
            bookId: desired.bookId,
            snapshot: previous,
            publishedAt,
          })

          const nextRevision = lock.rollback_revision
          const rollbackSnapshot = serializeSnapshot(current)
          await updatePublicationLock(connection, desired.bookId, {
            revision: nextRevision,
            rollbackRevision: nextRevision === null ? null : desired.revision,
            rollbackSnapshot,
            publishedPartIds: restored.publishedPartIds,
          })

          return {
            status: "rolled_back",
            bookId: desired.bookId,
            revision: nextRevision,
            previousRevision: desired.revision,
            rollbackRevision: nextRevision === null ? null : desired.revision,
            publishedAt,
            publishedPartIds: restored.publishedPartIds,
            stalePartIds: restored.stalePartIds,
            parts: restored.parts,
          }
        }),
      maxRetries)
    },

    async reconcile(bookId) {
      return withConnection(database, async (connection, release) => {
        try {
          const publication = await fetchPublication(connection, bookId)
          const snapshot = await loadPublishedSnapshot(connection, bookId)
          return {
            exists: Boolean(publication),
            bookId: Number(bookId),
            revision: publication?.revision ?? null,
            rollbackRevision: publication?.rollback_revision ?? null,
            rollbackSnapshot: publication?.rollback_snapshot
              ? deserializeSnapshot(publication.rollback_snapshot)
              : null,
            publishedPartIds: publication?.published_part_ids
              ? parseJsonColumn(publication.published_part_ids)
              : snapshot.parts.map((part) => part.id),
            parts: snapshot.parts,
          }
        } finally {
          release()
        }
      })
    },
  }
}

async function withRetries(run, maxRetries) {
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      return await run()
    } catch (error) {
      attempt += 1
      if (attempt >= maxRetries || !isRetryable(error)) throw error
    }
  }
  throw new Error("Unreachable retry state")
}

function isRetryable(error) {
  return DEADLOCK_CODES.has(error?.code) || DUPLICATE_CODES.has(error?.code)
}

async function withTransaction(database, callback) {
  return withConnection(database, async (connection, release) => {
    await connection.beginTransaction()
    try {
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      release()
    }
  })
}

async function withConnection(database, callback) {
  if (typeof database.getConnection === "function") {
    const connection = await database.getConnection()
    return callback(connection, () => connection.release?.())
  }
  return callback(database, () => {})
}

function normalizeCommand(command) {
  if (!command || typeof command !== "object") {
    throw new Error("Publish command is required")
  }

  const bookId = asPositiveInteger(command.bookId ?? command.book_id, "bookId")
  const revision = asRevision(command.revision, "revision")
  const expectedPriorRevision = nullableRevision(
    command.expectedPriorRevision ?? command.expected_prior_revision ?? null,
    "expectedPriorRevision",
  )
  const parts = normalizeParts(command.parts)

  return { bookId, revision, expectedPriorRevision, parts }
}

function normalizeRollback(command) {
  if (!command || typeof command !== "object") {
    throw new Error("Rollback command is required")
  }

  return {
    bookId: asPositiveInteger(command.bookId ?? command.book_id, "bookId"),
    revision: asRevision(command.revision, "revision"),
  }
}

function normalizeParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return []
  }

  const seen = new Set()
  return parts
    .map((part) => normalizePart(part))
    .sort((left, right) => left.partNumber - right.partNumber)
    .map((part) => {
      if (seen.has(part.partNumber)) {
        throw new Error(`Duplicate part number: ${part.partNumber}`)
      }
      seen.add(part.partNumber)
      return part
    })
}

function normalizePart(part) {
  if (!part || typeof part !== "object") {
    throw new Error("Audiobook part must be an object")
  }

  const chapters = Array.isArray(part.chapters)
    ? part.chapters.map((chapter, index) => normalizeChapter(chapter, index))
    : []

  return {
    id: part.id ?? null,
    partNumber: asPositiveInteger(part.partNumber ?? part.part_number, "partNumber"),
    title: asString(part.title, "title"),
    r2Key: asString(part.r2Key ?? part.r2_key, "r2Key"),
    mimeType: part.mimeType ?? part.mime_type ?? "audio/mpeg",
    durationMs: asNonNegativeInteger(part.durationMs ?? part.duration_ms, "durationMs"),
    byteLength: nullableInteger(part.byteLength ?? part.byte_length, "byteLength"),
    etag: nullableString(part.etag),
    lastModifiedAt: nullableDate(part.lastModifiedAt ?? part.last_modified_at),
    language: part.language ? String(part.language) : "vi",
    narrator: nullableString(part.narrator),
    transcriptR2Key: nullableString(part.transcriptR2Key ?? part.transcript_r2_key),
    transcriptFormat: nullableString(part.transcriptFormat ?? part.transcript_format),
    publishedAt: nullableDate(part.publishedAt ?? part.published_at),
    chapters,
  }
}

function normalizeChapter(chapter, index) {
  if (!chapter || typeof chapter !== "object") {
    throw new Error("Audiobook chapter must be an object")
  }

  return {
    sequence: asPositiveInteger(chapter.sequence ?? index + 1, "sequence"),
    title: asString(chapter.title, "chapter.title"),
    startMs: asNonNegativeInteger(chapter.startMs ?? chapter.start_ms, "chapter.startMs"),
    endMs: nullableInteger(chapter.endMs ?? chapter.end_ms, "chapter.endMs"),
  }
}

function asPositiveInteger(value, field) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`Invalid ${field}`)
  }
  return number
}

function asRevision(value, field) {
  const text = String(value || "").trim()
  if (!REVISION_PATTERN.test(text)) throw new Error(`Invalid ${field}`)
  return text.toLowerCase()
}

function nullableRevision(value, field) {
  if (value === undefined || value === null || value === "") return null
  return asRevision(value, field)
}

function asNonNegativeInteger(value, field) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`Invalid ${field}`)
  }
  return number
}

function nullableInteger(value, field) {
  if (value === undefined || value === null) return null
  return asNonNegativeInteger(value, field)
}

function asString(value, field) {
  const text = String(value || "").trim()
  if (!text) throw new Error(`Invalid ${field}`)
  return text
}

function nullableString(value) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text || null
}

function nullableDate(value) {
  if (value === undefined || value === null || value === "") return null
  if (value instanceof Date) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Invalid lastModifiedAt")
  return date
}

function decidePublish(currentRevision, expectedPriorRevision, nextRevision) {
  if (currentRevision === nextRevision) return "noop"
  if (currentRevision === (expectedPriorRevision ?? null)) return "apply"
  return "stale"
}

async function lockPublication(connection, bookId) {
  await connection.query(
    "INSERT IGNORE INTO audiobook_publications (book_id) VALUES (?)",
    [bookId],
  )

  const [rows] = await connection.query(
    "SELECT book_id, revision, rollback_revision, rollback_snapshot, published_part_ids FROM audiobook_publications WHERE book_id = ? FOR UPDATE",
    [bookId],
  )

  if (!rows[0]) throw new Error(`Missing audiobook publication lock for book ${bookId}`)
  return rows[0]
}

async function fetchPublication(connection, bookId) {
  const [rows] = await connection.query(
    "SELECT book_id, revision, rollback_revision, rollback_snapshot, published_part_ids FROM audiobook_publications WHERE book_id = ?",
    [bookId],
  )
  return rows[0] || null
}

async function loadPublishedSnapshot(connection, bookId) {
  const [parts] = await connection.query(
    "SELECT id, book_id, part_number, title, r2_key, mime_type, duration_ms, byte_length, etag, last_modified_at, language, narrator, transcript_r2_key, transcript_format, published_at FROM audiobook_parts WHERE book_id = ? AND published_at IS NOT NULL ORDER BY part_number ASC",
    [bookId],
  )

  if (!parts.length) return { parts: [] }

  const ids = parts.map((part) => part.id)
  const placeholders = ids.map(() => "?").join(", ")
  const [chapters] = await connection.query(
    `SELECT id, part_id, sequence, title, start_ms, end_ms FROM audiobook_chapters WHERE part_id IN (${placeholders}) ORDER BY part_id ASC, sequence ASC`,
    ids,
  )

  const chaptersByPartId = new Map()
  for (const chapter of chapters) {
    if (!chaptersByPartId.has(chapter.part_id)) chaptersByPartId.set(chapter.part_id, [])
    chaptersByPartId.get(chapter.part_id).push({
      id: chapter.id,
      sequence: chapter.sequence,
      title: chapter.title,
      startMs: chapter.start_ms,
      endMs: chapter.end_ms,
    })
  }

  return {
    parts: parts.map((part) => ({
      id: part.id,
      bookId: part.book_id,
      partNumber: part.part_number,
      title: part.title,
      r2Key: part.r2_key,
      mimeType: part.mime_type,
      durationMs: part.duration_ms,
      byteLength: part.byte_length,
      etag: part.etag,
      lastModifiedAt: part.last_modified_at,
      language: part.language,
      narrator: part.narrator,
      transcriptR2Key: part.transcript_r2_key,
      transcriptFormat: part.transcript_format,
      publishedAt: part.published_at,
      chapters: chaptersByPartId.get(part.id) || [],
    })),
  }
}

async function applyPublication(connection, { bookId, desired, current, publishedAt }) {
  const currentByPartNumber = new Map(current.parts.map((part) => [part.partNumber, part]))
  const desiredNumbers = desired.parts.map((part) => part.partNumber)
  const staleParts = current.parts.filter((part) => !desiredNumbers.includes(part.partNumber))
  const parts = []

  for (const part of desired.parts) {
    const previous = currentByPartNumber.get(part.partNumber)
    const effectivePublishedAt = part.publishedAt || publishedAt
    await connection.query(
      "INSERT INTO audiobook_parts (book_id, part_number, title, r2_key, mime_type, duration_ms, byte_length, etag, last_modified_at, language, narrator, transcript_r2_key, transcript_format, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), r2_key = VALUES(r2_key), mime_type = VALUES(mime_type), duration_ms = VALUES(duration_ms), byte_length = VALUES(byte_length), etag = VALUES(etag), last_modified_at = VALUES(last_modified_at), language = VALUES(language), narrator = VALUES(narrator), transcript_r2_key = VALUES(transcript_r2_key), transcript_format = VALUES(transcript_format), published_at = VALUES(published_at)",
      [
        bookId,
        part.partNumber,
        part.title,
        part.r2Key,
        part.mimeType,
        part.durationMs,
        part.byteLength,
        part.etag,
        part.lastModifiedAt,
        part.language,
        part.narrator,
        part.transcriptR2Key,
        part.transcriptFormat,
        effectivePublishedAt,
      ],
    )

    const [rows] = await connection.query(
      "SELECT id FROM audiobook_parts WHERE book_id = ? AND part_number = ?",
      [bookId, part.partNumber],
    )
    const partId = rows[0].id

    await replaceChapters(connection, partId, part.chapters)

    parts.push({
      id: previous?.id ?? partId,
      bookId,
      partNumber: part.partNumber,
      title: part.title,
      r2Key: part.r2Key,
      mimeType: part.mimeType,
      durationMs: part.durationMs,
      byteLength: part.byteLength,
      etag: part.etag,
      lastModifiedAt: nullableDate(part.lastModifiedAt),
      language: part.language,
      narrator: part.narrator,
      transcriptR2Key: part.transcriptR2Key,
      transcriptFormat: part.transcriptFormat,
      publishedAt: effectivePublishedAt,
      chapters: part.chapters.map((chapter) => ({ ...chapter })),
    })
  }

  await unpublishStale(connection, bookId, staleParts)

  return {
    publishedPartIds: parts.map((part) => part.id),
    stalePartIds: staleParts.map((part) => part.id),
    parts,
  }
}

async function restoreSnapshot(connection, { bookId, snapshot, publishedAt }) {
  const desired = {
    bookId,
    revision: null,
    parts: snapshot.parts.map((part) => ({
      id: part.id,
      partNumber: part.partNumber,
      title: part.title,
      r2Key: part.r2Key,
      mimeType: part.mimeType,
      durationMs: part.durationMs,
      byteLength: part.byteLength,
      etag: part.etag,
      lastModifiedAt: nullableDate(part.lastModifiedAt),
      language: part.language,
      narrator: part.narrator,
      transcriptR2Key: part.transcriptR2Key,
      transcriptFormat: part.transcriptFormat,
      publishedAt: nullableDate(part.publishedAt),
      chapters: part.chapters.map((chapter) => ({
        sequence: chapter.sequence,
        title: chapter.title,
        startMs: chapter.startMs,
        endMs: chapter.endMs,
      })),
    })),
  }

  const current = await loadPublishedSnapshot(connection, bookId)
  return applyPublication(connection, { bookId, desired, current, publishedAt })
}

async function replaceChapters(connection, partId, chapters) {
  await connection.query("DELETE FROM audiobook_chapters WHERE part_id = ?", [partId])

  for (const chapter of chapters) {
    await connection.query(
      "INSERT INTO audiobook_chapters (part_id, sequence, title, start_ms, end_ms) VALUES (?, ?, ?, ?, ?)",
      [partId, chapter.sequence, chapter.title, chapter.startMs, chapter.endMs],
    )
  }
}

async function unpublishStale(connection, bookId, staleParts) {
  if (!staleParts.length) return

  const partIds = staleParts.map((part) => part.id)
  await connection.query(
    `DELETE FROM audiobook_chapters WHERE part_id IN (${partIds.map(() => "?").join(", ")})`,
    partIds,
  )
  await connection.query(
    `UPDATE audiobook_parts SET published_at = NULL WHERE book_id = ? AND published_at IS NOT NULL AND part_number IN (${staleParts.map(() => "?").join(", ")})`,
    [bookId, ...staleParts.map((part) => part.partNumber)],
  )
}

async function updatePublicationLock(connection, bookId, values) {
  await connection.query(
    "UPDATE audiobook_publications SET revision = ?, rollback_revision = ?, rollback_snapshot = ?, published_part_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?",
    [
      values.revision,
      values.rollbackRevision,
      values.rollbackSnapshot,
      JSON.stringify(values.publishedPartIds),
      bookId,
    ],
  )
}

function serializeSnapshot(snapshot) {
  const payload = JSON.parse(
    JSON.stringify({
      schemaVersion: 1,
      parts: snapshot.parts,
    }),
  )
  return JSON.stringify({
    ...payload,
    digest: crypto.createHash("sha256").update(stableSerialize(payload)).digest("hex"),
  })
}

function deserializeSnapshot(value) {
  if (!value) return { parts: [] }
  const parsed = parseJsonColumn(value)
  if (
    parsed?.schemaVersion !== 1 ||
    !Array.isArray(parsed.parts) ||
    !/^[a-f0-9]{64}$/.test(String(parsed.digest || ""))
  )
    throw new Error("Invalid audiobook rollback snapshot schema")
  const expectedDigest = crypto
    .createHash("sha256")
    .update(
      stableSerialize({
        schemaVersion: parsed.schemaVersion,
        parts: parsed.parts,
      }),
    )
    .digest("hex")
  if (expectedDigest !== parsed.digest)
    throw new Error("Audiobook rollback snapshot digest mismatch")
  return {
    schemaVersion: parsed.schemaVersion,
    digest: parsed.digest,
    parts: parsed.parts.map((part) => ({
      ...part,
      chapters: Array.isArray(part.chapters) ? part.chapters.map((chapter) => ({ ...chapter })) : [],
    })),
  }
}

function parseJsonColumn(value) {
  return typeof value === "string" ? JSON.parse(value) : value
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`
  return JSON.stringify(value)
}

function buildOutcome(status, bookId, lock, current) {
  return {
    status,
    bookId,
    revision: lock.revision,
    rollbackRevision: lock.rollback_revision,
    publishedPartIds: current.parts.map((part) => part.id),
    parts: current.parts,
  }
}

module.exports = {
  DEADLOCK_CODES,
  DEFAULT_MAX_RETRIES,
  DUPLICATE_CODES,
  createAudiobookPublisher,
}
