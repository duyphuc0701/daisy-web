import React, { useState, useEffect, useCallback } from 'react'
import { History, BookMarked, Heart, AlertCircle, Library, BookOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../navigation'
import HistoryCard from '../components/HistoryCard'
import SavedBookCard from '../components/SavedBookCard'
import FavoriteBookCard from '../components/FavoriteBookCard'

/**
 * Activity Page – "Trang Hoạt Động"
 *
 * Displays three sections:
 *  1. Lịch sử nghe     — listening history with progress
 *  2. Thư viện cá nhân — saved books
 *  3. Sách yêu thích   — favorited books
 *
 * A11y:
 *  - Semantic structure: <main> > <section> > <h1>, <h2>
 *  - aria-live="polite" announcement region at page top
 *  - aria-busy on loading states
 *  - All dynamic changes (remove, empty) announced via the live region
 *  - Protected: unauthenticated users are redirected to /login
 */
function Activity() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── Auth Guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  // ── State ─────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState([])
  const [savedBooks, setSavedBooks] = useState([])
  const [favoriteBooks, setFavoriteBooks] = useState([])

  const [historyLoading, setHistoryLoading] = useState(true)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [favoritesLoading, setFavoritesLoading] = useState(true)

  const [historyError, setHistoryError] = useState(null)
  const [libraryError, setLibraryError] = useState(null)
  const [favoritesError, setFavoritesError] = useState(null)

  // Screen-reader announcement string — updated on dynamic changes
  const [announcement, setAnnouncement] = useState('')

  const announce = (msg) => setAnnouncement(msg)

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch('/api/activity/history', { credentials: 'include' })
      if (!res.ok) throw new Error('Không thể tải lịch sử nghe')
      const data = await res.json()
      setHistory(data.history)
    } catch (err) {
      setHistoryError(err.message)
    } finally {
      setHistoryLoading(false)
    }
  }, [user])

  const fetchLibrary = useCallback(async () => {
    if (!user) return
    setLibraryLoading(true)
    setLibraryError(null)
    try {
      const res = await fetch('/api/activity/library', { credentials: 'include' })
      if (!res.ok) throw new Error('Không thể tải thư viện cá nhân')
      const data = await res.json()
      setSavedBooks(data.saved)
    } catch (err) {
      setLibraryError(err.message)
    } finally {
      setLibraryLoading(false)
    }
  }, [user])

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    setFavoritesLoading(true)
    setFavoritesError(null)
    try {
      const res = await fetch('/api/activity/favorites', { credentials: 'include' })
      if (!res.ok) throw new Error('Không thể tải danh sách sách yêu thích')
      const data = await res.json()
      setFavoriteBooks(data.favorites)
    } catch (err) {
      setFavoritesError(err.message)
    } finally {
      setFavoritesLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchHistory()
    fetchLibrary()
    fetchFavorites()
  }, [fetchHistory, fetchLibrary, fetchFavorites])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleDeleteHistory(entry) {
    try {
      const res = await fetch(`/api/activity/history/${entry.book_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Xóa thất bại')
      setHistory((prev) => prev.filter((h) => h.book_id !== entry.book_id))
      announce(`Đã xóa "${entry.title}" khỏi lịch sử nghe`)
    } catch {
      announce('Không thể xóa mục này, vui lòng thử lại')
    }
  }

  async function handleRemoveFromLibrary(entry) {
    try {
      const res = await fetch(`/api/activity/library/${entry.book_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Xóa thất bại')
      setSavedBooks((prev) => prev.filter((b) => b.book_id !== entry.book_id))
      announce(`Đã xóa "${entry.title}" khỏi thư viện cá nhân`)
    } catch {
      announce('Không thể xóa sách này, vui lòng thử lại')
    }
  }

  async function handleRemoveFromFavorites(entry) {
    try {
      const res = await fetch(`/api/activity/favorite/${entry.book_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Xóa thất bại')
      setFavoriteBooks((prev) => prev.filter((b) => b.book_id !== entry.book_id))
      announce(`Đã bỏ "${entry.title}" khỏi danh sách sách yêu thích`)
    } catch {
      announce('Không thể bỏ yêu thích sách này, vui lòng thử lại')
    }
  }

  // Don't render until user is confirmed (avoid flash before redirect)
  if (!user) return null

  return (
    <div className="activity-page">
      {/* ── Global Screen-Reader Live Region ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="activity-announcer"
      >
        {announcement}
      </div>

      {/* ── Page Header ── */}
      <header className="activity-page-header">
        <h1 className="activity-page-title">
          Trang hoạt động
        </h1>
        <p className="activity-page-subtitle">
          Xin chào, <strong>{user.username}</strong>! Đây là lịch sử nghe, thư viện cá nhân và danh sách sách yêu thích của bạn.
        </p>
      </header>

      {/* ── Section 1: Listening History ── */}
      <section
        className="activity-section"
        aria-labelledby="history-heading"
      >
        <div className="activity-section-header">
          <div className="activity-section-title-group">
            <History size={22} aria-hidden="true" className="activity-section-icon" />
            <h2 id="history-heading" className="activity-section-heading">
              Lịch sử nghe
            </h2>
          </div>
          {!historyLoading && !historyError && (
            <span className="activity-section-count" aria-hidden="true">
              {history.length} sách
            </span>
          )}
        </div>

        {historyLoading ? (
          <div
            className="activity-loading"
            aria-busy="true"
            aria-label="Đang tải lịch sử nghe"
          >
            <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderTopColor: 'var(--primary)', borderWidth: '3px' }} />
            <span>Đang tải lịch sử nghe...</span>
          </div>
        ) : historyError ? (
          <div className="activity-error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Đã xảy ra lỗi</strong>
              <p>{historyError}</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="activity-empty" role="status">
            <BookOpen size={40} aria-hidden="true" />
            <h3>Chưa có lịch sử nghe</h3>
            <p>Bắt đầu nghe một cuốn sách để lịch sử của bạn xuất hiện tại đây.</p>
          </div>
        ) : (
          <ul
            className="activity-card-list"
            aria-label={`Danh sách ${history.length} sách đang nghe`}
          >
            {history.map((entry) => (
              <li key={entry.book_id}>
                <HistoryCard
                  entry={entry}
                  onDelete={handleDeleteHistory}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Section 2: Personal Library ── */}
      <section
        className="activity-section"
        aria-labelledby="library-heading"
      >
        <div className="activity-section-header">
          <div className="activity-section-title-group">
            <BookMarked size={22} aria-hidden="true" className="activity-section-icon" />
            <h2 id="library-heading" className="activity-section-heading">
              Thư viện cá nhân
            </h2>
          </div>
          {!libraryLoading && !libraryError && (
            <span className="activity-section-count" aria-hidden="true">
              {savedBooks.length} sách
            </span>
          )}
        </div>

        {libraryLoading ? (
          <div
            className="activity-loading"
            aria-busy="true"
            aria-label="Đang tải thư viện cá nhân"
          >
            <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderTopColor: 'var(--primary)', borderWidth: '3px' }} />
            <span>Đang tải thư viện cá nhân...</span>
          </div>
        ) : libraryError ? (
          <div className="activity-error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Đã xảy ra lỗi</strong>
              <p>{libraryError}</p>
            </div>
          </div>
        ) : savedBooks.length === 0 ? (
          <div className="activity-empty" role="status">
            <Library size={40} aria-hidden="true" />
            <h3>Thư viện trống</h3>
            <p>Lưu sách vào thư viện để dễ dàng truy cập sau này.</p>
          </div>
        ) : (
          <ul
            className="activity-card-list"
            aria-label={`Danh sách ${savedBooks.length} sách đã lưu`}
          >
            {savedBooks.map((entry) => (
              <li key={entry.book_id}>
                <SavedBookCard
                  entry={entry}
                  onRemove={handleRemoveFromLibrary}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Section 3: Favorite Books ── */}
      <section
        className="activity-section"
        aria-labelledby="favorites-heading"
      >
        <div className="activity-section-header">
          <div className="activity-section-title-group">
            <Heart size={22} aria-hidden="true" className="activity-section-icon" style={{ color: 'hsl(340, 82%, 52%)' }} />
            <h2 id="favorites-heading" className="activity-section-heading">
              Sách yêu thích
            </h2>
          </div>
          {!favoritesLoading && !favoritesError && (
            <span className="activity-section-count" aria-hidden="true" style={{ backgroundColor: 'hsl(340, 82%, 96%)', color: 'hsl(340, 82%, 45%)', borderColor: 'hsl(340, 82%, 85%)' }}>
              {favoriteBooks.length} sách
            </span>
          )}
        </div>

        {favoritesLoading ? (
          <div
            className="activity-loading"
            aria-busy="true"
            aria-label="Đang tải danh sách sách yêu thích"
          >
            <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', borderTopColor: 'hsl(340, 82%, 52%)', borderWidth: '3px' }} />
            <span>Đang tải danh sách sách yêu thích...</span>
          </div>
        ) : favoritesError ? (
          <div className="activity-error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Đã xảy ra lỗi</strong>
              <p>{favoritesError}</p>
            </div>
          </div>
        ) : favoriteBooks.length === 0 ? (
          <div className="activity-empty" role="status">
            <Heart size={40} aria-hidden="true" style={{ color: 'hsl(340, 82%, 52%)' }} />
            <h3>Chưa có sách yêu thích</h3>
            <p>Nhấn vào biểu tượng trái tim ở trang chi tiết sách để thêm sách yêu thích của bạn.</p>
          </div>
        ) : (
          <ul
            className="activity-card-list"
            aria-label={`Danh sách ${favoriteBooks.length} sách yêu thích`}
          >
            {favoriteBooks.map((entry) => (
              <li key={entry.book_id}>
                <FavoriteBookCard
                  entry={entry}
                  onRemove={handleRemoveFromFavorites}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Activity
