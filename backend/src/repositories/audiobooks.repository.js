function createAudiobooksRepository(database) {
  return {
    async findCatalog(bookId) {
      const [books] = await database.query(
        "SELECT id, title FROM books WHERE id = ?",
        [bookId],
      );
      if (!books[0]) return null;
      const [parts] = await database.query(
        "SELECT id, book_id, part_number, title, mime_type, duration_ms, language, narrator, transcript_r2_key FROM audiobook_parts WHERE book_id = ? AND published_at IS NOT NULL ORDER BY part_number ASC",
        [bookId],
      );
      if (!parts.length) return null;
      const ids = parts.map((part) => part.id);
      const [chapters] = await database.query(
        `SELECT id, part_id, sequence, title, start_ms, end_ms FROM audiobook_chapters WHERE part_id IN (${ids.map(() => "?").join(", ")}) ORDER BY part_id ASC, sequence ASC`,
        ids,
      );
      return { book: books[0], parts, chapters };
    },
    async findPart(bookId, partId) {
      const [rows] = await database.query(
        "SELECT id, book_id, part_number, title, r2_key, mime_type, duration_ms, language, narrator, transcript_r2_key, transcript_format FROM audiobook_parts WHERE id = ? AND book_id = ? AND published_at IS NOT NULL",
        [partId, bookId],
      );
      return rows[0] || null;
    },
    async findChapters(partId) {
      const [rows] = await database.query(
        "SELECT id, sequence, title, start_ms, end_ms FROM audiobook_chapters WHERE part_id = ? ORDER BY sequence ASC",
        [partId],
      );
      return rows;
    },
  };
}
module.exports = createAudiobooksRepository;
