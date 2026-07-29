const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const mysql = require("mysql2/promise");
const {
  createAudiobookPublisher,
} = require("../src/ingestion/audiobook-publisher");

const enabled = process.env.AUDIOBOOK_MYSQL_TEST === "1";
const suite = enabled ? describe : describe.skip;
const REVISION_A = "a".repeat(64);
const REVISION_B = "b".repeat(64);
const REVISION_C = "c".repeat(64);

function part(partNumber, suffix, chapters = []) {
  return {
    partNumber,
    title: `Part ${partNumber} ${suffix}`,
    r2Key: `audio-books/mysql-test/${suffix}/part-${partNumber}.mp3`,
    mimeType: "audio/mpeg",
    durationMs: 10_000,
    byteLength: 1_024 + partNumber,
    etag: `"etag-${suffix}-${partNumber}"`,
    lastModifiedAt: new Date("2026-07-29T00:00:00.000Z"),
    language: "vi-VN",
    narrator: "Integration narrator",
    transcriptR2Key: `audio-books/mysql-test/${suffix}/part-${partNumber}.json`,
    transcriptFormat: "timed-text",
    chapters,
  };
}

suite("audiobook publisher MySQL integration", () => {
  let database;
  let publisher;

  before(async () => {
    database = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "daisy_library",
      connectionLimit: 2,
    });
    publisher = createAudiobookPublisher(database);
    await cleanup([204, 205]);
  });

  after(async () => {
    await cleanup([204, 205]);
    await database.end();
  });

  async function cleanup(bookIds) {
    if (!database) return;
    for (const bookId of bookIds) {
      const [rows] = await database.query(
        "SELECT id FROM audiobook_parts WHERE book_id = ?",
        [bookId],
      );
      const partIds = rows.map((row) => row.id);
      if (partIds.length)
        await database.query(
          `DELETE FROM audiobook_chapters WHERE part_id IN (${partIds
            .map(() => "?")
            .join(",")})`,
          partIds,
        );
      await database.query("DELETE FROM audiobook_parts WHERE book_id = ?", [
        bookId,
      ]);
      await database.query(
        "DELETE FROM audiobook_publications WHERE book_id = ?",
        [bookId],
      );
    }
  }

  it("publishes, preserves retained ids, unpublishes stale parts, and restores the prior snapshot", async () => {
    const first = await publisher.publish({
      bookId: 205,
      revision: REVISION_A,
      expectedPriorRevision: null,
      parts: [
        part(1, "a", [
          { sequence: 1, title: "One", startMs: 0, endMs: 5_000 },
          { sequence: 2, title: "Two", startMs: 5_000, endMs: 10_000 },
        ]),
        part(2, "a"),
      ],
    });
    assert.equal(first.status, "published");
    const originalIds = first.publishedPartIds;

    const second = await publisher.publish({
      bookId: 205,
      revision: REVISION_B,
      expectedPriorRevision: REVISION_A,
      parts: [
        part(1, "b", [
          { sequence: 1, title: "Replacement", startMs: 0, endMs: 10_000 },
        ]),
      ],
    });
    assert.equal(second.status, "published");
    assert.equal(second.publishedPartIds[0], originalIds[0]);
    assert.deepEqual(second.stalePartIds, [originalIds[1]]);

    const [staleRows] = await database.query(
      "SELECT published_at FROM audiobook_parts WHERE id = ?",
      [originalIds[1]],
    );
    assert.equal(staleRows[0].published_at, null);

    const rolledBack = await publisher.rollback({
      bookId: 205,
      revision: REVISION_B,
    });
    assert.equal(rolledBack.status, "rolled_back");
    assert.equal(rolledBack.revision, REVISION_A);
    assert.deepEqual(rolledBack.publishedPartIds, originalIds);

    const reconciled = await publisher.reconcile(205);
    assert.equal(reconciled.revision, REVISION_A);
    assert.equal(reconciled.parts.length, 2);
    assert.equal(reconciled.parts[0].chapters.length, 2);
    assert.equal(reconciled.parts[0].r2Key.includes("/a/"), true);
  });

  it("rolls a first publication back to the explicit null fence", async () => {
    const published = await publisher.publish({
      bookId: 204,
      revision: REVISION_C,
      expectedPriorRevision: null,
      parts: [part(1, "c")],
    });
    assert.equal(published.status, "published");

    const rolledBack = await publisher.rollback({
      bookId: 204,
      revision: REVISION_C,
    });
    assert.equal(rolledBack.status, "rolled_back");
    assert.equal(rolledBack.revision, null);

    const reconciled = await publisher.reconcile(204);
    assert.equal(reconciled.revision, null);
    assert.deepEqual(reconciled.parts, []);
    const [rows] = await database.query(
      "SELECT id, published_at FROM audiobook_parts WHERE book_id = ?",
      [204],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].published_at, null);
  });
});
