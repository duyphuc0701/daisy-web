const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const path = require("node:path")
const { describe, it } = require("node:test")
const { createAudiobookPublisher } = require("../src/ingestion/audiobook-publisher")

const REV_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const REV_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const REV_C = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"

function createFakeDatabase({ scriptedErrors = [] } = {}) {
  const state = {
    nextPartId: 1,
    nextChapterId: 1,
    publications: new Map(),
    parts: new Map(),
    chapters: new Map(),
  }

  const normalizeSql = (sql) => sql.replace(/\s+/g, " ").trim()
  const clone = () => ({
    nextPartId: state.nextPartId,
    nextChapterId: state.nextChapterId,
    publications: new Map(
      [...state.publications.entries()].map(([key, value]) => [key, { ...value }]),
    ),
    parts: new Map([...state.parts.entries()].map(([key, value]) => [key, { ...value }])),
    chapters: new Map(
      [...state.chapters.entries()].map(([key, value]) => [key, value.map((row) => ({ ...row }))]),
    ),
  })
  const restore = (snapshot) => {
    state.nextPartId = snapshot.nextPartId
    state.nextChapterId = snapshot.nextChapterId
    state.publications = snapshot.publications
    state.parts = snapshot.parts
    state.chapters = snapshot.chapters
  }

  const maybeThrow = (sql) => {
    const entry = scriptedErrors.find((candidate) => {
      if (candidate.times < 1) return false
      return typeof candidate.match === "function"
        ? candidate.match(sql)
        : candidate.match.test(sql)
    })
    if (!entry) return
    entry.times -= 1
    const error = new Error(entry.error.message)
    error.code = entry.error.code
    throw error
  }

  const connection = {
    async beginTransaction() {
      connection.snapshot = clone()
    },
    async commit() {
      connection.snapshot = null
    },
    async rollback() {
      if (connection.snapshot) restore(connection.snapshot)
      connection.snapshot = null
    },
    release() {},
    async query(sql, params = []) {
      const text = normalizeSql(sql)
      maybeThrow(text)

      if (text.startsWith("INSERT IGNORE INTO audiobook_publications")) {
        const [bookId] = params
        if (!state.publications.has(bookId)) {
          state.publications.set(bookId, {
            book_id: bookId,
            revision: null,
            rollback_revision: null,
            rollback_snapshot: null,
            published_part_ids: JSON.stringify([]),
          })
        }
        return [{ affectedRows: 1 }]
      }
      if (text.includes("FROM audiobook_publications WHERE book_id = ? FOR UPDATE")) {
        const row = state.publications.get(params[0])
        return [[row ? { ...row } : undefined].filter(Boolean)]
      }
      if (text.includes("FROM audiobook_publications WHERE book_id = ?")) {
        const row = state.publications.get(params[0])
        return [[row ? { ...row } : undefined].filter(Boolean)]
      }
      if (text.startsWith("UPDATE audiobook_publications SET revision = ?")) {
        const [revision, rollbackRevision, rollbackSnapshot, publishedPartIds, bookId] = params
        state.publications.set(bookId, {
          ...state.publications.get(bookId),
          revision,
          rollback_revision: rollbackRevision,
          rollback_snapshot: rollbackSnapshot,
          published_part_ids: publishedPartIds,
        })
        return [{ affectedRows: 1 }]
      }
      if (text.startsWith("SELECT id, book_id, part_number")) {
        const [bookId] = params
        return [[...state.parts.values()]
          .filter((part) => part.book_id === bookId && part.published_at !== null)
          .sort((a, b) => a.part_number - b.part_number)
          .map((part) => ({ ...part }))]
      }
      if (text.startsWith("SELECT id, part_id, sequence")) {
        const ids = new Set(params)
        const rows = [...state.chapters.entries()]
          .filter(([partId]) => ids.has(partId))
          .flatMap(([, chapters]) => chapters.map((chapter) => ({ ...chapter })))
          .sort((a, b) => a.part_id - b.part_id || a.sequence - b.sequence)
        return [rows]
      }
      if (text.startsWith("INSERT INTO audiobook_parts")) {
        const [bookId, partNumber, title, r2Key, mimeType, durationMs, byteLength, etag, lastModifiedAt, language, narrator, transcriptR2Key, transcriptFormat, publishedAt] = params
        const existing = [...state.parts.values()].find(
          (part) => part.book_id === bookId && part.part_number === partNumber,
        )
        if (existing) {
          Object.assign(existing, {
            title,
            r2_key: r2Key,
            mime_type: mimeType,
            duration_ms: durationMs,
            byte_length: byteLength,
            etag,
            last_modified_at: lastModifiedAt,
            language,
            narrator,
            transcript_r2_key: transcriptR2Key,
            transcript_format: transcriptFormat,
            published_at: publishedAt,
          })
          return [{ affectedRows: 2, insertId: existing.id }]
        }
        const row = {
          id: state.nextPartId++,
          book_id: bookId,
          part_number: partNumber,
          title,
          r2_key: r2Key,
          mime_type: mimeType,
          duration_ms: durationMs,
          byte_length: byteLength,
          etag,
          last_modified_at: lastModifiedAt,
          language,
          narrator,
          transcript_r2_key: transcriptR2Key,
          transcript_format: transcriptFormat,
          published_at: publishedAt,
        }
        state.parts.set(row.id, row)
        return [{ affectedRows: 1, insertId: row.id }]
      }
      if (text === "SELECT id FROM audiobook_parts WHERE book_id = ? AND part_number = ?") {
        const [bookId, partNumber] = params
        const row = [...state.parts.values()].find(
          (part) => part.book_id === bookId && part.part_number === partNumber,
        )
        return [[row ? { id: row.id } : undefined].filter(Boolean)]
      }
      if (text === "DELETE FROM audiobook_chapters WHERE part_id = ?") {
        state.chapters.set(params[0], [])
        return [{ affectedRows: 1 }]
      }
      if (text.startsWith("DELETE FROM audiobook_chapters WHERE part_id IN (")) {
        params.forEach((partId) => state.chapters.set(partId, []))
        return [{ affectedRows: params.length }]
      }
      if (text.startsWith("INSERT INTO audiobook_chapters")) {
        const [partId, sequence, title, startMs, endMs] = params
        const chapters = state.chapters.get(partId) || []
        chapters.push({
          id: state.nextChapterId++,
          part_id: partId,
          sequence,
          title,
          start_ms: startMs,
          end_ms: endMs,
        })
        state.chapters.set(partId, chapters)
        return [{ affectedRows: 1 }]
      }
      if (text.startsWith("UPDATE audiobook_parts SET published_at = NULL")) {
        const [bookId, ...partNumbers] = params
        for (const part of state.parts.values()) {
          if (part.book_id === bookId && part.published_at !== null && partNumbers.includes(part.part_number)) {
            part.published_at = null
          }
        }
        return [{ affectedRows: partNumbers.length }]
      }
      throw new Error(`Unhandled SQL in fake database: ${text}`)
    },
  }

  return {
    state,
    async getConnection() {
      return connection
    },
  }
}

function makePart(overrides = {}) {
  return {
    partNumber: 1,
    title: "Part 1",
    r2Key: "audio/p1.mp3",
    mimeType: "audio/mpeg",
    durationMs: 3000,
    byteLength: 1024,
    etag: '"etag-1"',
    lastModifiedAt: new Date("2026-07-29T00:00:00Z"),
    language: "vi-VN",
    narrator: "Narrator",
    transcriptR2Key: "transcripts/p1.json",
    transcriptFormat: "timed-text",
    chapters: [{ sequence: 1, title: "Chương 1", startMs: 0, endMs: 3000 }],
    ...overrides,
  }
}

describe("audiobook publisher", () => {
  it("publishes first digest revision from a null prior and reconciles metadata", async () => {
    const database = createFakeDatabase()
    const publisher = createAudiobookPublisher(database, {
      now: () => new Date("2026-07-29T08:00:00Z"),
    })

    const result = await publisher.publish({
      bookId: 42,
      revision: REV_A,
      expectedPriorRevision: null,
      parts: [makePart(), makePart({ partNumber: 2, title: "Part 2", r2Key: "audio/p2.mp3", transcriptR2Key: "transcripts/p2.json" })],
    })

    assert.equal(result.status, "published")
    assert.equal(result.previousRevision, null)
    assert.deepEqual(result.publishedPartIds, [1, 2])
    const publication = database.state.publications.get(42)
    assert.deepEqual({
      ...publication,
      rollback_snapshot: undefined,
    }, {
      book_id: 42,
      revision: REV_A,
      rollback_revision: null,
      rollback_snapshot: undefined,
      published_part_ids: JSON.stringify([1, 2]),
    })
    const rollbackSnapshot = JSON.parse(publication.rollback_snapshot)
    assert.equal(rollbackSnapshot.schemaVersion, 1)
    assert.deepEqual(rollbackSnapshot.parts, [])
    assert.match(rollbackSnapshot.digest, /^[a-f0-9]{64}$/)

    const reconciled = await publisher.reconcile(42)
    assert.equal(reconciled.revision, REV_A)
    assert.equal(reconciled.parts[0].id, 1)
    assert.equal(reconciled.parts[1].id, 2)
  })

  it("returns noop when the same digest is already published", async () => {
    const database = createFakeDatabase()
    const publisher = createAudiobookPublisher(database)

    await publisher.publish({ bookId: 1, revision: REV_A, expectedPriorRevision: null, parts: [makePart()] })
    const noop = await publisher.publish({ bookId: 1, revision: REV_A, expectedPriorRevision: null, parts: [makePart({ title: "ignored" })] })

    assert.equal(noop.status, "noop")
    assert.equal(database.state.publications.get(1).revision, REV_A)
    assert.equal(database.state.parts.get(1).title, "Part 1")
  })

  it("applies an expected-prior transition, retains ids, and unpublishes stale rows", async () => {
    const database = createFakeDatabase()
    const publisher = createAudiobookPublisher(database, {
      now: () => new Date("2026-07-29T09:00:00Z"),
    })

    const first = await publisher.publish({
      bookId: 7,
      revision: REV_A,
      expectedPriorRevision: null,
      parts: [
        makePart({ partNumber: 1, title: "Original 1", r2Key: "audio/original-1.mp3" }),
        makePart({ partNumber: 2, title: "Original 2", r2Key: "audio/original-2.mp3" }),
      ],
    })

    const second = await publisher.publish({
      bookId: 7,
      revision: REV_B,
      expectedPriorRevision: REV_A,
      parts: [makePart({ partNumber: 1, title: "Updated 1", r2Key: "audio/updated-1.mp3" })],
    })

    assert.equal(second.status, "published")
    assert.deepEqual(second.publishedPartIds, [first.publishedPartIds[0]])
    assert.deepEqual(second.stalePartIds, [first.publishedPartIds[1]])
    assert.equal(database.state.parts.get(first.publishedPartIds[0]).title, "Updated 1")
    assert.equal(database.state.parts.get(first.publishedPartIds[1]).published_at, null)
    assert.equal(database.state.publications.get(7).revision, REV_B)
    assert.equal(database.state.publications.get(7).rollback_revision, REV_A)
  })

  it("rejects a stale writer when expected prior does not match current", async () => {
    const database = createFakeDatabase()
    const publisher = createAudiobookPublisher(database)

    await publisher.publish({ bookId: 5, revision: REV_A, expectedPriorRevision: null, parts: [makePart()] })
    const stale = await publisher.publish({
      bookId: 5,
      revision: REV_B,
      expectedPriorRevision: REV_C,
      parts: [makePart({ title: "stale" })],
    })

    assert.equal(stale.status, "stale")
    assert.equal(database.state.publications.get(5).revision, REV_A)
    assert.equal(database.state.parts.get(1).title, "Part 1")
  })

  it("rolls back only when the requested digest matches current and restores exact prior ids", async () => {
    const database = createFakeDatabase()
    const publisher = createAudiobookPublisher(database, {
      now: () => new Date("2026-07-29T10:00:00Z"),
    })

    const first = await publisher.publish({
      bookId: 9,
      revision: REV_A,
      expectedPriorRevision: null,
      parts: [
        makePart({ partNumber: 1, title: "Original 1" }),
        makePart({ partNumber: 2, title: "Original 2", r2Key: "audio/p2.mp3", transcriptR2Key: "transcripts/p2.json" }),
      ],
    })
    await publisher.publish({
      bookId: 9,
      revision: REV_B,
      expectedPriorRevision: REV_A,
      parts: [makePart({ partNumber: 1, title: "Updated 1" })],
    })

    const mismatch = await publisher.rollback({ bookId: 9, revision: REV_C })
    assert.equal(mismatch.status, "stale")

    const rolledBack = await publisher.rollback({ bookId: 9, revision: REV_B })
    assert.equal(rolledBack.status, "rolled_back")
    assert.equal(rolledBack.revision, REV_A)
    assert.deepEqual(rolledBack.publishedPartIds, first.publishedPartIds)
    assert.equal(rolledBack.parts[0].id, first.publishedPartIds[0])
    assert.equal(rolledBack.parts[1].id, first.publishedPartIds[1])
  })

  it("fails closed when the DB-held rollback snapshot is corrupted", async () => {
    const database = createFakeDatabase()
    const publisher = createAudiobookPublisher(database)

    await publisher.publish({
      bookId: 10,
      revision: REV_A,
      expectedPriorRevision: null,
      parts: [makePart()],
    })
    await publisher.publish({
      bookId: 10,
      revision: REV_B,
      expectedPriorRevision: REV_A,
      parts: [makePart({ title: "Updated" })],
    })
    const row = database.state.publications.get(10)
    const snapshot = JSON.parse(row.rollback_snapshot)
    snapshot.parts[0].title = "tampered"
    row.rollback_snapshot = JSON.stringify(snapshot)

    await assert.rejects(
      publisher.rollback({ bookId: 10, revision: REV_B }),
      /snapshot digest mismatch/,
    )
    assert.equal(database.state.publications.get(10).revision, REV_B)
    assert.equal(database.state.parts.get(1).title, "Updated")
  })

  it("retries a deadlock during lock-row setup and then succeeds", async () => {
    const database = createFakeDatabase({
      scriptedErrors: [{
        match: /INSERT IGNORE INTO audiobook_publications/,
        error: { code: "ER_LOCK_DEADLOCK", message: "deadlock" },
        times: 1,
      }],
    })
    const publisher = createAudiobookPublisher(database)

    const result = await publisher.publish({
      bookId: 11,
      revision: REV_A,
      expectedPriorRevision: null,
      parts: [makePart()],
    })

    assert.equal(result.status, "published")
    assert.equal(database.state.publications.get(11).revision, REV_A)
  })

  it("keeps the additive migration on disk with digest fence columns", async () => {
    const sql = await fs.readFile(
      path.join(__dirname, "../../database/migrations/20260729_add_audiobook_publications.sql"),
      "utf8",
    )

    assert.match(sql, /CREATE TABLE IF NOT EXISTS audiobook_publications/i)
    assert.match(sql, /revision CHAR\(64\) NULL/i)
    assert.match(sql, /rollback_revision CHAR\(64\) NULL/i)
    assert.match(sql, /rollback_snapshot JSON NULL/i)
    assert.match(sql, /published_part_ids JSON NULL/i)
  })
})
