import React from "react";
import { Play, Pause, Maximize2, X } from "lucide-react";

export default function MiniAudioPlayer({
  title,
  chapterTitle,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onExpand,
  onClose,
}) {
  // Tính % tiến trình thanh mini
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        width: "320px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      {/* Thanh tiến trình siêu mỏng phía trên */}
      <div style={{ width: "100%", height: "3px", backgroundColor: "#f3f4f6" }}>
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            backgroundColor: "#059669",
            transition: "width 0.2s linear",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          gap: "8px",
        }}
      >
        {/* Thông tin tên sách / chương */}
        <div
          onClick={onExpand}
          style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
          title="Bấm để phóng to lại"
        >
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title || "Sách nói DAISY"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {chapterTitle || "Đang phát..."}
          </div>
        </div>

        {/* Cụm nút điều khiển */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Nút Play/Pause */}
          <button
            onClick={onTogglePlay}
            style={{
              background: "#059669",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          {/* Nút Phóng to */}
          <button
            onClick={onExpand}
            title="Phóng to"
            style={{
              background: "transparent",
              border: "none",
              color: "#4b5563",
              padding: "6px",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            <Maximize2 size={16} />
          </button>

          {/* Nút Đóng mini player */}
          <button
            onClick={onClose}
            title="Tắt mini player"
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              padding: "6px",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
