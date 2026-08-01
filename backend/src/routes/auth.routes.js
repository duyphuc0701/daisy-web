const express = require('express');

function createAuthRouter(authController, authMiddleware) {
  const router = express.Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.post('/logout', authController.logout);
  router.get('/profile', authMiddleware, authController.getProfile);
  router.post('/forgot-password', authController.forgotPassword);
  router.post('/reset-password', authController.resetPassword);

  return router;
}

module.exports = createAuthRouter;
