/**
 * PlayerControls.jsx
 * Play/Pause button and buffering indicator.
 */
import React from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'

function PlayerControls({ isPlaying, isBuffering, onTogglePlay }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <button
        id="audiobook-play-pause-btn"
        className="player-btn player-btn-play"
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
      >
        {isPlaying
          ? <Pause size={20} fill="currentColor" />
          : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
        }
      </button>

      {isBuffering && (
        <div className="player-buffering" aria-live="polite">
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Đang tải luồng âm thanh...</span>
        </div>
      )}
    </div>
  )
}

export default PlayerControls
