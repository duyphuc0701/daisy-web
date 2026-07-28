/**
 * ChapterList.jsx
 * Danh sách chương của một phần (part).
 * Highlight chương đang phát, nhảy đến chương khi nhấn.
 *
 * Props:
 *   chapters        – Chapter[]   { id, title, startMs, endMs }
 *   partDurationMs  – number      tổng thời lượng của part (ms), dùng làm endMs fallback
 *   activeChapterId – number|null id của chương đang active
 *   onChapterClick  – (chapter) => void
 *   formatTime      – (secs: number) => string
 */
import React from 'react'

function ChapterList({ chapters, partDurationMs, activeChapterId, onChapterClick, formatTime }) {
  if (!chapters || chapters.length === 0) {
    return (
      <div className="chapters-layout">
        <div className="chapters-title-bar">Danh sách chương</div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Không có thông tin chương cho phần này.
        </p>
      </div>
    )
  }

  return (
    <div className="chapters-layout">
      <div className="chapters-title-bar">Danh sách chương</div>
      <div className="chapters-list" role="list" aria-label="Danh sách chương">
        {chapters.map((chapter) => {
          const isActive = activeChapterId === chapter.id
          const endMs = chapter.endMs !== null && chapter.endMs !== undefined
            ? chapter.endMs
            : partDurationMs
          const durationSecs = Math.max(0, (endMs - chapter.startMs) / 1000)

          return (
            <button
              key={chapter.id}
              role="listitem"
              onClick={() => onChapterClick(chapter)}
              className={`chapter-item-btn${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${chapter.title} – ${formatTime(durationSecs)}`}
            >
              <span className="chapter-title-text">{chapter.title}</span>
              <span className="chapter-duration">{formatTime(durationSecs)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ChapterList
