import React, { useState } from 'react'
import { BookOpen, Bookmark, Trash2, AlertTriangle } from 'lucide-react'
import { Link } from '../navigation'

/**
 * SavedBookCard – accessible card for a book in the user's personal library.
 *
 * A11y:
 *  - All icons are aria-hidden (decorative)
 *  - Accessible two-step confirmation for deletion (avoids inaccessible window.confirm())
 *    Step 1: click delete → shows inline confirmation prompt announced via aria-live
 *    Step 2: confirm or cancel via keyboard/click
 *  - Descriptive aria-labels on all buttons
 */
function SavedBookCard({ entry, onRemove }) {
  const [confirming, setConfirming] = useState(false)
  const { book_id, title, author, image, category } = entry

  const coverImage = image || '/images/default_cover.jpg'
  const authorName = author || 'Khuyết danh'

  function handleRequestDelete() {
    setConfirming(true)
  }

  function handleConfirmDelete() {
    setConfirming(false)
    onRemove(entry)
  }

  function handleCancelDelete() {
    setConfirming(false)
  }

  return (
    <article
      className="saved-book-card"
      aria-label={`Sách đã lưu: ${title}, tác giả ${authorName}`}
    >
      {/* Book Cover */}
      <div className="saved-book-card-cover" aria-hidden="true">
        <img src={coverImage} alt="" loading="lazy" />
        <div className="saved-book-badge" aria-hidden="true">
          <Bookmark size={14} />
        </div>
      </div>

      {/* Content */}
      <div className="saved-book-card-body">
        {category && (
          <span className="activity-card-category" aria-hidden="true">{category}</span>
        )}
        <h3 className="activity-card-title">{title}</h3>
        <p className="activity-card-author">{authorName}</p>

        {/* Actions */}
        <div className="activity-card-actions">
          <Link
            to={`/book/${book_id}`}
            className="btn btn-primary activity-card-btn"
            aria-label={`Xem chi tiết sách "${title}"`}
          >
            <BookOpen size={16} aria-hidden="true" />
            Xem chi tiết
          </Link>

          {!confirming ? (
            <button
              className="btn btn-ghost activity-card-btn-delete"
              onClick={handleRequestDelete}
              aria-label={`Xóa "${title}" khỏi thư viện cá nhân`}
            >
              <Trash2 size={16} aria-hidden="true" />
              <span className="sr-only">Xóa khỏi thư viện</span>
            </button>
          ) : (
            /* Two-step accessible confirmation — announced via the parent aria-live region */
            <div className="saved-book-confirm" role="group" aria-label={`Xác nhận xóa "${title}" khỏi thư viện`}>
              <AlertTriangle size={14} aria-hidden="true" className="saved-book-confirm-icon" />
              <span className="saved-book-confirm-text">Xác nhận xóa?</span>
              <button
                className="btn btn-danger-sm"
                onClick={handleConfirmDelete}
                aria-label={`Xác nhận xóa "${title}" khỏi thư viện`}
                autoFocus
              >
                Xóa
              </button>
              <button
                className="btn btn-ghost-sm"
                onClick={handleCancelDelete}
                aria-label="Hủy xóa"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default SavedBookCard
