const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/email.service');

function createAuthController(authRepository, { env = process.env } = {}) {
  const cookieName = env.AUDIO_SESSION_COOKIE_NAME || 'daisy_session';
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };

  function issueToken(user) {
    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required to issue authentication tokens');
    }

    return jwt.sign(
      { id: user.id, username: user.username },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1d' }
    );
  }

  function establishSession(res, token) {
    res.cookie(cookieName, token, cookieOptions);
  }
  async function register(req, res, next) {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập, email và mật khẩu' });
      }

      // Check if user exists
      const existingUser = await authRepository.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
      }

      const existingEmail = await authRepository.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email đã tồn tại' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await authRepository.createUser(username, email, passwordHash);

      // Generate token
      const token = issueToken(user);
      establishSession(res, token);

      res.status(201).json({ user, token });
    } catch (error) {
      next(error);
    }
  }

  async function login(req, res, next) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
      }

      // Find user
      const user = await authRepository.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
      }

      // Generate token
      const token = issueToken(user);
      establishSession(res, token);

      res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
    } catch (error) {
      next(error);
    }
  }

  async function getProfile(req, res, next) {
    try {
      const user = req.user;
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  function logout(_req, res) {
    res.clearCookie(cookieName, {
      httpOnly: cookieOptions.httpOnly,
      sameSite: cookieOptions.sameSite,
      secure: cookieOptions.secure,
      path: cookieOptions.path,
    });
    res.status(204).end();
  }

  async function forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Vui lòng nhập email' });
      }

      const user = await authRepository.findByEmail(email);
      if (!user) {
        // Return 200 to prevent email enumeration
        return res.json({ message: 'Nếu email tồn tại trên hệ thống, một liên kết khôi phục sẽ được gửi đến hộp thư của bạn.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      // 1 hour expiry
      const expiry = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' ');

      await authRepository.saveResetToken(user.id, resetToken, expiry);

      const clientUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
      const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken, clientUrl);
      if (emailSent) {
        res.json({ message: 'Nếu email tồn tại trên hệ thống, một liên kết khôi phục sẽ được gửi đến hộp thư của bạn.' });
      } else {
        res.status(500).json({ error: 'Không thể gửi email khôi phục' });
      }
    } catch (error) {
      next(error);
    }
  }

  async function resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Vui lòng cung cấp token và mật khẩu mới' });
      }

      const user = await authRepository.findByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      await authRepository.updatePassword(user.id, passwordHash);

      res.json({ message: 'Mật khẩu đã được đặt lại thành công' });
    } catch (error) {
      next(error);
    }
  }

  return {
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword
  };
}

module.exports = createAuthController;
