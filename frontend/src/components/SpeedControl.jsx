/**
 * SpeedControl.jsx
 * Dropdown để chọn tốc độ phát (0.5x → 2.0x).
 * Props:
 *   speed         – number (current playback rate)
 *   onSpeedChange – (value: number) => void
 */
import React from 'react'

const SPEED_OPTIONS = [
  { value: 0.5,  label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0,  label: '1.0x (Chuẩn)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5,  label: '1.5x' },
  { value: 2.0,  label: '2.0x' },
]

function SpeedControl({ speed, onSpeedChange }) {
  const handleChange = (e) => onSpeedChange(parseFloat(e.target.value))

  return (
    <div className="speed-control-wrapper">
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 550 }}>
        Tốc độ:
      </span>
      <select
        id="audiobook-speed-select"
        value={speed}
        onChange={handleChange}
        className="speed-select"
        aria-label="Thay đổi tốc độ phát"
      >
        {SPEED_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SpeedControl
