/**
 * Activity Controller
 *
 * Handles HTTP requests for the Activity Page:
 *  - Listening history  (GET / PUT /:bookId/progress / DELETE /:bookId/history)
 *  - Personal library   (GET /library / POST /library/:bookId / DELETE /library/:bookId / GET /library/:bookId/status)
 *
 * All routes require an authenticated user (req.user set by auth middleware).
 */
function createActivityController(activityRepository) {
  // ── History ───────────────────────────────────────────────────────────────

  async function getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const history = await activityRepository.getHistory(userId);
      res.json({ history });
    } catch (error) {
      next(error);
    }
  }

  async function upsertProgress(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      const { progress_percent, last_position_ms, last_part_id } = req.body;

      if (
        typeof progress_percent !== 'number' ||
        progress_percent < 0 ||
        progress_percent > 100
      ) {
        return res.status(400).json({ error: 'progress_percent phải là số từ 0 đến 100' });
      }

      if (typeof last_position_ms !== 'number' || last_position_ms < 0) {
        return res.status(400).json({ error: 'last_position_ms phải là số không âm' });
      }

      await activityRepository.upsertHistory(userId, bookId, {
        progress_percent: Math.round(progress_percent),
        last_position_ms: Math.round(last_position_ms),
        last_part_id: last_part_id ?? null,
      });

      res.json({ message: 'Đã lưu tiến độ nghe' });
    } catch (error) {
      next(error);
    }
  }

  async function deleteHistoryEntry(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      await activityRepository.deleteHistory(userId, bookId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  // ── Personal Library ──────────────────────────────────────────────────────

  async function getLibrary(req, res, next) {
    try {
      const userId = req.user.id;
      const saved = await activityRepository.getSavedBooks(userId);
      res.json({ saved });
    } catch (error) {
      next(error);
    }
  }

  async function addToLibrary(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      await activityRepository.saveBook(userId, bookId);
      res.status(201).json({ message: 'Đã lưu sách vào thư viện' });
    } catch (error) {
      next(error);
    }
  }

  async function removeFromLibrary(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      await activityRepository.unsaveBook(userId, bookId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async function checkLibraryStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      const saved = await activityRepository.isBookSaved(userId, bookId);
      res.json({ saved });
    } catch (error) {
      next(error);
    }
  }

  // ── Favorite Books ────────────────────────────────────────────────────────

  async function getFavorites(req, res, next) {
    try {
      const userId = req.user.id;
      const favorites = await activityRepository.getFavoriteBooks(userId);
      res.json({ favorites });
    } catch (error) {
      next(error);
    }
  }

  async function addToFavorites(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      await activityRepository.favoriteBook(userId, bookId);
      res.status(201).json({ message: 'Đã thêm vào danh sách yêu thích' });
    } catch (error) {
      next(error);
    }
  }

  async function removeFromFavorites(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      await activityRepository.unfavoriteBook(userId, bookId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async function checkFavoriteStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const bookId = parseInt(req.params.bookId, 10);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: 'book_id không hợp lệ' });
      }

      const favorited = await activityRepository.isBookFavorited(userId, bookId);
      res.json({ favorited });
    } catch (error) {
      next(error);
    }
  }

  return {
    getHistory,
    upsertProgress,
    deleteHistoryEntry,
    getLibrary,
    addToLibrary,
    removeFromLibrary,
    checkLibraryStatus,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    checkFavoriteStatus,
  };
}

module.exports = createActivityController;

