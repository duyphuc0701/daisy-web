/**
 * VolumeControl.jsx
 * Mute toggle button + volume slider (0–1).
 * Props:
 *   volume         – number 0..1
 *   isMuted        – boolean
 *   onVolumeChange – (value: number) => void
 *   onToggleMute   – () => void
 */
import React from 'react'
import { Volume2, VolumeX } from 'lucide-react'

function VolumeControl({ volume, isMuted, onVolumeChange, onToggleMute }) {
  const handleChange = (e) => onVolumeChange(parseFloat(e.target.value))

  return (
    <div className="volume-control-wrapper">
      <button
        id="audiobook-mute-btn"
        className="player-btn"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
      >
        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <input
        id="audiobook-volume-slider"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={isMuted ? 0 : volume}
        onChange={handleChange}
        className="volume-slider"
        aria-label="Điều chỉnh âm lượng"
      />
    </div>
  )
}

export default VolumeControl
