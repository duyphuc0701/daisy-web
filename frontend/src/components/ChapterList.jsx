/**
 * ChapterList.jsx
 * Danh sách chương đã được flatten từ các phần (part).
 * Highlight chương đang phát, nhảy đến chương khi nhấn.
 *
 * Props:
 *   chapters        – Chapter[]   { id, title, startMs, endMs, partTitle?, partDurationMs? }
 *   partDurationMs  – number      thời lượng fallback (ms)
 *   activeChapterId – string|null khóa của chương đang active
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
          const chapterKey = chapter.playbackKey ?? chapter.id
          const isActive = activeChapterId === chapterKey
          const fallbackDurationMs = chapter.partDurationMs ?? partDurationMs
          const endMs = chapter.endMs !== null && chapter.endMs !== undefined
            ? chapter.endMs
            : fallbackDurationMs
          const durationSecs = Math.max(0, (endMs - chapter.startMs) / 1000)
          const displayTitle = chapter.title

          return (
            <button
              key={chapterKey}
              role="listitem"
              onClick={() => onChapterClick(chapter)}
              className={`chapter-item-btn${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${displayTitle} - ${formatTime(durationSecs)}`}
            >
              <span className="chapter-title-text">{displayTitle}</span>
              <span className="chapter-duration">{formatTime(durationSecs)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ChapterList
