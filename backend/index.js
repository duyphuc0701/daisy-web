const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so the React app (running on a different port like 5173) can access the API
app.use(cors());
app.use(express.json());

// 1. GET /api/books - Get books with search and category filters
app.get('/api/books', async (req, res) => {
  const { search, category } = req.query;

  try {
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    // Filter by category
    if (category && category !== 'Tất cả') {
      sql += ' AND category = ?';
      params.push(category);
    }

    // Search query matches title, author, or publisher
    if (search) {
      sql += ' AND (title LIKE ? OR author LIKE ? OR publisher LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Execute query
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET /api/books/:id - Get detailed info for a single book
app.get('/api/books/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. GET /api/categories - Get distinct categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM books WHERE category IS NOT NULL ORDER BY category ASC');
    const categories = rows.map(row => row.category);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`DAISY Library API server is running on http://localhost:${PORT}`);
});
