const assert = require('node:assert/strict');
const { afterEach, describe, it, mock } = require('node:test');

process.env.NODE_ENV = 'test';

const { createApp } = require('../src/app');
const { startServer } = require('../src/server');

const servers = new Set();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      server =>
        new Promise((resolve, reject) => {
          server.close(error => (error ? reject(error) : resolve()));
        })
    )
  );
  servers.clear();
});

async function request(database, path, options) {
  const app = createApp({ database });
  const server = app.listen(0);
  servers.add(server);

  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();

  return fetch(`http://127.0.0.1:${port}${path}`, options);
}

function createDatabase(result) {
  return {
    query: mock.fn(async () => [result]),
  };
}

describe('GET /api/books', () => {
  it('returns every book without adding filters', async () => {
    const books = [{ id: 1, title: 'Bồ câu không đưa thư' }];
    const database = createDatabase(books);

    const response = await request(database, '/api/books');

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.deepEqual(await response.json(), books);
    assert.deepEqual(database.query.mock.calls[0].arguments, [
      'SELECT * FROM books WHERE 1=1',
      [],
    ]);
  });

  it('applies category before the title, author, and publisher search', async () => {
    const database = createDatabase([]);

    const response = await request(
      database,
      '/api/books?category=Ti%E1%BB%83u%20thuy%E1%BA%BFt&search=Kim%20%C4%90%E1%BB%93ng'
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    assert.deepEqual(database.query.mock.calls[0].arguments, [
      'SELECT * FROM books WHERE 1=1 AND category = ? AND (title LIKE ? OR author LIKE ? OR publisher LIKE ?)',
      ['Tiểu thuyết', '%Kim Đồng%', '%Kim Đồng%', '%Kim Đồng%'],
    ]);
  });

  it('treats the Tất cả category as no category filter', async () => {
    const database = createDatabase([]);

    const response = await request(
      database,
      '/api/books?category=T%E1%BA%A5t%20c%E1%BA%A3'
    );

    assert.equal(response.status, 200);
    assert.deepEqual(database.query.mock.calls[0].arguments, [
      'SELECT * FROM books WHERE 1=1',
      [],
    ]);
  });
});

describe('GET /api/books/:id', () => {
  it('returns the first matching book', async () => {
    const book = { id: 7, title: 'Example' };
    const database = createDatabase([book]);

    const response = await request(database, '/api/books/7');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), book);
    assert.deepEqual(database.query.mock.calls[0].arguments, [
      'SELECT * FROM books WHERE id = ?',
      ['7'],
    ]);
  });

  it('returns the existing not-found contract when no book matches', async () => {
    const database = createDatabase([]);

    const response = await request(database, '/api/books/999');

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Book not found' });
  });
});

describe('GET /api/categories', () => {
  it('returns category strings from the ordered distinct rows', async () => {
    const database = createDatabase([
      { category: 'Khoa học' },
      { category: 'Tiểu thuyết' },
    ]);

    const response = await request(database, '/api/categories');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), ['Khoa học', 'Tiểu thuyết']);
    assert.deepEqual(database.query.mock.calls[0].arguments, [
      'SELECT DISTINCT category FROM books WHERE category IS NOT NULL ORDER BY category ASC',
    ]);
  });
});

describe('database failures', () => {
  for (const path of ['/api/books', '/api/books/1', '/api/categories']) {
    it(`preserves the internal-server-error response for ${path}`, async () => {
      const database = {
        query: mock.fn(async () => {
          throw new Error('database unavailable');
        }),
      };
      const originalConsoleError = console.error;
      console.error = mock.fn();

      try {
        const response = await request(database, path);

        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), {
          error: 'Internal server error',
        });
        assert.equal(console.error.mock.callCount(), 1);
      } finally {
        console.error = originalConsoleError;
      }
    });
  }
});

describe('application boundaries', () => {
  it('keeps the public startup and database compatibility exports', () => {
    assert.equal(require('../index').startServer, startServer);
    assert.equal(typeof require('../db').query, 'function');
  });

  it('starts on an available port and reports the bound port', async () => {
    const app = createApp({ database: createDatabase([]) });
    const originalConsoleLog = console.log;
    console.log = mock.fn();

    try {
      const server = startServer({ app, port: 0 });
      servers.add(server);
      await new Promise(resolve => server.once('listening', resolve));

      const { port } = server.address();
      assert.match(
        console.log.mock.calls[0].arguments[0],
        new RegExp(`:${port}$`)
      );
    } finally {
      console.log = originalConsoleLog;
    }
  });

  it('preserves Express parsing errors instead of converting them to a 500', async () => {
    const originalConsoleError = console.error;
    console.error = mock.fn();

    try {
      const response = await request(createDatabase([]), '/api/books', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      });

      assert.equal(response.status, 400);
      assert.match(response.headers.get('content-type'), /^text\/html/);
    } finally {
      console.error = originalConsoleError;
    }
  });
});
