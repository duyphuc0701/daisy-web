import React, { useState } from 'react'
import { BookOpen, Heart, AlertTriangle } from 'lucide-react'
import { Link } from '../navigation'

/**
 * FavoriteBookCard – accessible card for a favorited book in the user's activity page.
 *
 * A11y:
 *  - All icons are aria-hidden (decorative)
 *  - Accessible two-step inline confirmation for removing from favorites (avoids window.confirm())
 *    Step 1: click Heart / Bỏ yêu thích → shows inline confirmation panel
 *    Step 2: confirm or cancel via keyboard / click
 *  - Descriptive aria-labels on all interactive buttons
 */
function FavoriteBookCard({ entry, onRemove }) {
  const [confirming, setConfirming] = useState(false)
  const { book_id, title, author, image, category } = entry

  const coverImage = image || '/images/default_cover.jpg'
  const authorName = author || 'Khuyết danh'

  function handleRequestRemove() {
    setConfirming(true)
  }

  function handleConfirmRemove() {
    setConfirming(false)
    onRemove(entry)
  }

  function handleCancelRemove() {
    setConfirming(false)
  }

  return (
    <article
      className="favorite-book-card"
      aria-label={`Sách yêu thích: ${title}, tác giả ${authorName}`}
    >
      {/* Book Cover */}
      <div className="favorite-book-card-cover" aria-hidden="true">
        <img src={coverImage} alt="" loading="lazy" />
        <div className="favorite-book-badge" aria-hidden="true">
          <Heart size={14} fill="currentColor" />
        </div>
      </div>

      {/* Content */}
      <div className="favorite-book-card-body">
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
              className="btn btn-ghost activity-card-btn-favorite"
              onClick={handleRequestRemove}
              aria-label={`Bỏ yêu thích "${title}"`}
            >
              <Heart size={16} aria-hidden="true" fill="hsl(340, 82%, 52%)" color="hsl(340, 82%, 52%)" />
              <span className="sr-only">Bỏ yêu thích</span>
            </button>
          ) : (
            /* Two-step accessible confirmation — announced via parent aria-live region */
            <div className="favorite-book-confirm" role="group" aria-label={`Xác nhận bỏ yêu thích "${title}"`}>
              <AlertTriangle size={14} aria-hidden="true" className="favorite-book-confirm-icon" />
              <span className="favorite-book-confirm-text">Bỏ yêu thích?</span>
              <button
                className="btn btn-danger-sm"
                onClick={handleConfirmRemove}
                aria-label={`Xác nhận bỏ yêu thích "${title}"`}
                autoFocus
              >
                Bỏ
              </button>
              <button
                className="btn btn-ghost-sm"
                onClick={handleCancelRemove}
                aria-label="Hủy"
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

export default FavoriteBookCard
