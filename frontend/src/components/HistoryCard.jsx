import React from 'react'
import { PlayCircle, Clock, Trash2 } from 'lucide-react'
import { useNavigate } from '../navigation'

/**
 * HistoryCard – accessible card representing a listening-history entry.
 *
 * A11y:
 *  - role="progressbar" with aria-valuenow / aria-valuemin / aria-valuemax / aria-valuetext
 *  - Descriptive aria-label on the "Tiếp tục nghe" button including title + percent
 *  - Descriptive aria-label on the "Xóa khỏi lịch sử" button including title
 *  - All icons are aria-hidden (decorative)
 */
function HistoryCard({ entry, onDelete }) {
  const navigate = useNavigate()
  const { book_id, title, author, image, category, progress_percent, last_played_at } = entry

  const coverImage = image || '/images/default_cover.jpg'
  const authorName = author || 'Khuyết danh'
  const percent = Math.min(100, Math.max(0, Math.round(progress_percent || 0)))

  // Format date to Vietnamese locale
  const formattedDate = last_played_at
    ? new Date(last_played_at).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  function handleResume() {
    navigate(`/book/${book_id}`)
  }

  return (
    <article
      className="activity-card"
      aria-label={`Sách đang nghe: ${title}, tác giả ${authorName}, đã nghe ${percent}%`}
    >
      {/* Book Cover */}
      <div className="activity-card-cover" aria-hidden="true">
        <img src={coverImage} alt="" loading="lazy" />
      </div>

      {/* Content */}
      <div className="activity-card-body">
        {category && (
          <span className="activity-card-category" aria-hidden="true">{category}</span>
        )}
        <h3 className="activity-card-title">{title}</h3>
        <p className="activity-card-author">{authorName}</p>

        {/* Progress Bar */}
        <div className="activity-progress-wrapper">
          <div
            className="activity-progress-track"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${percent} phần trăm đã nghe`}
            aria-label={`Tiến độ nghe: ${percent}%`}
          >
            <div
              className="activity-progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="activity-progress-label" aria-hidden="true">{percent}%</span>
        </div>

        {/* Timestamp */}
        {formattedDate && (
          <p className="activity-card-timestamp">
            <Clock size={12} aria-hidden="true" />
            <span>Lần cuối: {formattedDate}</span>
          </p>
        )}

        {/* Actions */}
        <div className="activity-card-actions">
          <button
            className="btn btn-primary activity-card-btn"
            onClick={handleResume}
            aria-label={`Tiếp tục nghe "${title}", đã nghe ${percent}%`}
          >
            <PlayCircle size={16} aria-hidden="true" />
            Tiếp tục nghe
          </button>

          <button
            className="btn btn-ghost activity-card-btn-delete"
            onClick={() => onDelete(entry)}
            aria-label={`Xóa "${title}" khỏi lịch sử nghe`}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span className="sr-only">Xóa khỏi lịch sử</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default HistoryCard
