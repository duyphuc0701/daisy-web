const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const database = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daisy_library',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = database;
