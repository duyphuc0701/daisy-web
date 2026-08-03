/**
 * Activity Repository
 *
 * Manages listening history and personal library (saved books) for a user.
 * All queries JOIN with `books` so callers receive full book metadata without
 * a second round-trip.
 */
function createActivityRepository(database) {
  // ── Listening History ──────────────────────────────────────────────────────

  /**
   * Return all history entries for a user, newest first.
   * @returns {Promise<Array>} rows with book metadata + progress fields
   */
  async function getHistory(userId) {
    const [rows] = await database.query(
      `SELECT
         lh.id,
         lh.book_id,
         lh.progress_percent,
         lh.last_position_ms,
         lh.last_part_id,
         lh.last_played_at,
         b.title,
         b.author,
         b.image,
         b.category
       FROM listening_history lh
       JOIN books b ON b.id = lh.book_id
       WHERE lh.user_id = ?
       ORDER BY lh.last_played_at DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Insert or update a history entry (upsert on unique user_id + book_id).
   * @param {number} userId
   * @param {number} bookId
   * @param {{ progress_percent: number, last_position_ms: number, last_part_id: number|null }} data
   */
  async function upsertHistory(userId, bookId, { progress_percent, last_position_ms, last_part_id }) {
    await database.query(
      `INSERT INTO listening_history
         (user_id, book_id, progress_percent, last_position_ms, last_part_id, last_played_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         progress_percent  = VALUES(progress_percent),
         last_position_ms  = VALUES(last_position_ms),
         last_part_id      = VALUES(last_part_id),
         last_played_at    = NOW()`,
      [userId, bookId, progress_percent, last_position_ms, last_part_id ?? null]
    );
  }

  /**
   * Remove a single history entry for a user+book.
   */
  async function deleteHistory(userId, bookId) {
    await database.query(
      'DELETE FROM listening_history WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
  }

  // ── Saved Books (Personal Library) ────────────────────────────────────────

  /**
   * Return all saved books for a user, newest first.
   */
  async function getSavedBooks(userId) {
    const [rows] = await database.query(
      `SELECT
         sb.id,
         sb.book_id,
         sb.saved_at,
         b.title,
         b.author,
         b.image,
         b.category
       FROM saved_books sb
       JOIN books b ON b.id = sb.book_id
       WHERE sb.user_id = ?
       ORDER BY sb.saved_at DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Add a book to the user's library. Silently ignores duplicates.
   */
  async function saveBook(userId, bookId) {
    await database.query(
      'INSERT IGNORE INTO saved_books (user_id, book_id) VALUES (?, ?)',
      [userId, bookId]
    );
  }

  /**
   * Remove a book from the user's library.
   */
  async function unsaveBook(userId, bookId) {
    await database.query(
      'DELETE FROM saved_books WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
  }

  /**
   * Check whether a book is saved by a user.
   * @returns {Promise<boolean>}
   */
  /**
   * Check whether a book is saved by a user.
   * @returns {Promise<boolean>}
   */
  async function isBookSaved(userId, bookId) {
    const [rows] = await database.query(
      'SELECT 1 FROM saved_books WHERE user_id = ? AND book_id = ? LIMIT 1',
      [userId, bookId]
    );
    return rows.length > 0;
  }

  // ── Favorite Books ────────────────────────────────────────────────────────

  /**
   * Return all favorite books for a user, newest first.
   */
  async function getFavoriteBooks(userId) {
    const [rows] = await database.query(
      `SELECT
         fb.id,
         fb.book_id,
         fb.created_at,
         b.title,
         b.author,
         b.image,
         b.category
       FROM favorite_books fb
       JOIN books b ON b.id = fb.book_id
       WHERE fb.user_id = ?
       ORDER BY fb.created_at DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Add a book to user's favorites. Ignores duplicates.
   */
  async function favoriteBook(userId, bookId) {
    await database.query(
      'INSERT IGNORE INTO favorite_books (user_id, book_id) VALUES (?, ?)',
      [userId, bookId]
    );
  }

  /**
   * Remove a book from user's favorites.
   */
  async function unfavoriteBook(userId, bookId) {
    await database.query(
      'DELETE FROM favorite_books WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
  }

  /**
   * Check whether a book is favorited by a user.
   * @returns {Promise<boolean>}
   */
  async function isBookFavorited(userId, bookId) {
    const [rows] = await database.query(
      'SELECT 1 FROM favorite_books WHERE user_id = ? AND book_id = ? LIMIT 1',
      [userId, bookId]
    );
    return rows.length > 0;
  }

  return {
    getHistory,
    upsertHistory,
    deleteHistory,
    getSavedBooks,
    saveBook,
    unsaveBook,
    isBookSaved,
    getFavoriteBooks,
    favoriteBook,
    unfavoriteBook,
    isBookFavorited,
  };
}


module.exports = createActivityRepository;
