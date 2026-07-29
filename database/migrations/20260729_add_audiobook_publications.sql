CREATE TABLE IF NOT EXISTS audiobook_publications (
  book_id INT NOT NULL PRIMARY KEY,
  revision CHAR(64) NULL,
  rollback_revision CHAR(64) NULL,
  rollback_snapshot JSON NULL,
  published_part_ids JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_audiobook_publications_book FOREIGN KEY (book_id) REFERENCES books(id),
  CONSTRAINT chk_audiobook_publications_revision CHECK (revision IS NULL OR revision REGEXP '^[0-9a-f]{64}$'),
  CONSTRAINT chk_audiobook_publications_rollback_revision CHECK (rollback_revision IS NULL OR rollback_revision REGEXP '^[0-9a-f]{64}$')
);
