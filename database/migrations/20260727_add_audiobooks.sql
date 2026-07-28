CREATE TABLE IF NOT EXISTS audiobook_parts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  part_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  r2_key VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'audio/mpeg',
  duration_ms BIGINT UNSIGNED NOT NULL,
  byte_length BIGINT UNSIGNED NULL,
  etag VARCHAR(255) NULL,
  last_modified_at DATETIME NULL,
  language VARCHAR(35) NOT NULL DEFAULT 'vi',
  narrator VARCHAR(255) NULL,
  transcript_r2_key VARCHAR(1024) NULL,
  transcript_format VARCHAR(32) NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_audiobook_parts_book FOREIGN KEY (book_id) REFERENCES books(id),
  CONSTRAINT uq_audiobook_parts_book_number UNIQUE (book_id, part_number),
  CONSTRAINT chk_audiobook_parts_mime CHECK (mime_type = 'audio/mpeg')
);
CREATE TABLE IF NOT EXISTS audiobook_chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_id INT NOT NULL,
  sequence INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_ms BIGINT UNSIGNED NOT NULL,
  end_ms BIGINT UNSIGNED NULL,
  CONSTRAINT fk_audiobook_chapters_part FOREIGN KEY (part_id) REFERENCES audiobook_parts(id) ON DELETE CASCADE,
  CONSTRAINT uq_audiobook_chapters_part_sequence UNIQUE (part_id, sequence),
  CONSTRAINT chk_audiobook_chapters_time CHECK (end_ms IS NULL OR end_ms >= start_ms)
);
