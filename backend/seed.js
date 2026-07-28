const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daisy_library',
};

async function seed() {
  console.log('Starting database seeding...');
  console.log('Database configuration:', { ...dbConfig, password: dbConfig.password ? '****' : '(none)' });

  let connection;
  try {
    // Connect without database selected first to create it if it doesn't exist
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    console.log('Connected to MySQL server. Creating database if not exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.query(`USE \`${dbConfig.database}\``);

    console.log('Creating books table if not exists...');
    await connection.query(`
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
      )
    `);

    // Read books.json
    const booksJsonPath = path.join(__dirname, '../books.json');
    if (!fs.existsSync(booksJsonPath)) {
      throw new Error(`books.json file not found at ${booksJsonPath}`);
    }

    const booksData = JSON.parse(fs.readFileSync(booksJsonPath, 'utf8'));
    console.log(`Read ${booksData.length} books from books.json.`);

    // Clear existing data
    console.log('Clearing existing books...');
    await connection.query('TRUNCATE TABLE books');

    // Insert books
    console.log('Inserting books into the database...');
    const insertQuery = `
      INSERT INTO books (id, title, author, image, description, publisher, year, category, downloadUrl, viewUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let insertedCount = 0;
    for (const book of booksData) {
      await connection.query(insertQuery, [
        book.id,
        book.title,
        book.author || null,
        book.image || null,
        book.description || null,
        book.publisher || null,
        book.year ? String(book.year) : null,
        book.category || null,
        book.downloadUrl || null,
        book.viewUrl || null
      ]);
      insertedCount++;
    }

    console.log(`Success! Seeded ${insertedCount} books successfully.`);
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();
