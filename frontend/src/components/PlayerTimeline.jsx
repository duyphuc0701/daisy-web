/**
 * PlayerTimeline.jsx
 * Seek slider with elapsed / total time labels.
 * Props:
 *   currentTime  – number (seconds)
 *   duration     – number (seconds)
 *   onSeek       – (value: number) => void
 *   formatTime   – (secs: number) => string
 */
import React from 'react'

function PlayerTimeline({ currentTime, duration, onSeek, formatTime }) {
  const handleChange = (e) => onSeek(parseFloat(e.target.value))

  return (
    <div className="timeline-control">
      <div className="timeline-bar-wrapper">
        <span className="time-label" aria-label="Thời gian hiện tại">
          {formatTime(currentTime)}
        </span>
        <input
          id="audiobook-seek-bar"
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleChange}
          className="timeline-slider"
          aria-label="Thanh trượt thời gian phát"
        />
        <span className="time-label" aria-label="Tổng thời lượng">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

export default PlayerTimeline
