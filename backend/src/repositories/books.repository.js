const ALL_CATEGORIES = 'Tất cả';

function createBooksRepository(database) {
  return {
    async findAll({ search, category }) {
      let sql = 'SELECT * FROM books WHERE 1=1';
      const params = [];

      if (category && category !== ALL_CATEGORIES) {
        sql += ' AND category = ?';
        params.push(category);
      }

      if (search) {
        sql += ' AND (title LIKE ? OR author LIKE ? OR publisher LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const [rows] = await database.query(sql, params);
      return rows;
    },

    async findById(id) {
      const [rows] = await database.query(
        'SELECT * FROM books WHERE id = ?',
        [id]
      );

      return rows[0] || null;
    },
  };
}

module.exports = createBooksRepository;
