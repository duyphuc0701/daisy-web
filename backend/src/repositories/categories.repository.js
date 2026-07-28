const LIST_CATEGORIES_SQL =
  'SELECT DISTINCT category FROM books WHERE category IS NOT NULL ORDER BY category ASC';

function createCategoriesRepository(database) {
  return {
    async findAll() {
      const [rows] = await database.query(LIST_CATEGORIES_SQL);
      return rows.map(row => row.category);
    },
  };
}

module.exports = createCategoriesRepository;
