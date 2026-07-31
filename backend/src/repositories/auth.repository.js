function createAuthRepository(database) {
  async function findByUsername(username) {
    const [rows] = await database.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

  async function findByEmail(email) {
    const [rows] = await database.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  async function createUser(username, email, passwordHash) {
    const [result] = await database.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    return { id: result.insertId, username, email };
  }

  async function saveResetToken(userId, token, expiry) {
    await database.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [token, expiry, userId]
    );
  }

  async function findByResetToken(token) {
    const [rows] = await database.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    return rows[0];
  }

  async function updatePassword(userId, newPasswordHash) {
    await database.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [newPasswordHash, userId]
    );
  }

  return {
    findByUsername,
    findByEmail,
    createUser,
    saveResetToken,
    findByResetToken,
    updatePassword
  };
}

module.exports = createAuthRepository;
