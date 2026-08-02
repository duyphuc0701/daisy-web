const express = require('express');

/**
 * Activity Router
 *
 * All routes are protected by authMiddleware (JWT cookie verification).
 *
 * History:
 *   GET    /api/activity/history                  → list listening history
 *   PUT    /api/activity/history/:bookId/progress  → upsert playback progress
 *   DELETE /api/activity/history/:bookId           → remove from history
 *
 * Personal Library:
 *   GET    /api/activity/library                  → list saved books
 *   POST   /api/activity/library/:bookId           → add book to library
 *   DELETE /api/activity/library/:bookId           → remove book from library
 *   GET    /api/activity/library/:bookId/status    → check if book is saved
 */
function createActivityRouter(activityController, authMiddleware) {
  const router = express.Router();

  // All activity routes require authentication
  router.use(authMiddleware);

  // History
  router.get('/history', activityController.getHistory);
  router.put('/history/:bookId/progress', activityController.upsertProgress);
  router.delete('/history/:bookId', activityController.deleteHistoryEntry);

  // Personal Library
  router.get('/library', activityController.getLibrary);
  router.post('/library/:bookId', activityController.addToLibrary);
  router.delete('/library/:bookId', activityController.removeFromLibrary);
  router.get('/library/:bookId/status', activityController.checkLibraryStatus);

  // Favorites
  router.get('/favorites', activityController.getFavorites);
  router.post('/favorite/:bookId', activityController.addToFavorites);
  router.post('/favorites/:bookId', activityController.addToFavorites);
  router.delete('/favorite/:bookId', activityController.removeFromFavorites);
  router.delete('/favorites/:bookId', activityController.removeFromFavorites);
  router.get('/favorite/:bookId/status', activityController.checkFavoriteStatus);
  router.get('/favorites/:bookId/status', activityController.checkFavoriteStatus);

  return router;
}



module.exports = createActivityRouter;
