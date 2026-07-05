CREATE DATABASE IF NOT EXISTS daisy_library;
USE daisy_library;

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  image VARCHAR(512),
  description TEXT,
  publisher VARCHAR(255),
  year VARCHAR(50),
  category VARCHAR(255),
  downloadUrl VARCHAR(512),
  viewUrl VARCHAR(512)
);
