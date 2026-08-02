-- Listening history: tracks per-user playback progress for each book.
-- progress_percent: 0-100, stored as INT for fast sorting.
-- last_position_ms: raw position within the last-played audiobook part.
-- last_part_id: FK to audiobook_parts, nullable (book may have no audio yet).
CREATE TABLE IF NOT EXISTS listening_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  progress_percent INT NOT NULL DEFAULT 0,
  last_position_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,
  last_part_id INT NULL,
  last_played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_part FOREIGN KEY (last_part_id) REFERENCES audiobook_parts(id) ON DELETE SET NULL,
  CONSTRAINT uq_history_user_book UNIQUE (user_id, book_id)
);

-- Saved books: user's personal library / favourites.
CREATE TABLE IF NOT EXISTS saved_books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  CONSTRAINT uq_saved_user_book UNIQUE (user_id, book_id)
);
