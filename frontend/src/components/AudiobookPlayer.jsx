/**
 * AudiobookPlayer.jsx
 *
 * Orchestrator: Gọi API GET /api/books/:bookId/audio → nhận catalog,
 * quản lý toàn bộ state phát thanh, rồi lắp ráp các component con:
 *   PlayerControls  – phát/tạm dừng, buffering
 *   PlayerTimeline  – thanh seek + nhãn thời gian
 *   VolumeControl   – âm lượng + mute
 *   SpeedControl    – tốc độ phát
 *   ChapterList     – danh sách chương + đồng bộ vị trí hiện tại
 *
 * Props:
 *   bookId – string | number  (id của cuốn sách, dùng để fetch catalog)
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Headphones,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import PlayerControls from "./PlayerControls";
import PlayerTimeline from "./PlayerTimeline";
import VolumeControl from "./VolumeControl";
import SpeedControl from "./SpeedControl";
import ChapterList from "./ChapterList";
import { useAuth } from "../context/AuthContext";
import { useAudioHotkeys } from "../hooks/useAudioHotkeys";
import { Minimize2 } from "lucide-react";
import MiniAudioPlayer from "./MiniAudioPlayer";
import { useAudio } from "../context/AudioContext";
import { useNavigate } from "../navigation";
// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format seconds → "m:ss" hoặc "h:mm:ss" */
function formatTime(totalSecs) {
  if (!isFinite(totalSecs) || isNaN(totalSecs)) return "0:00";
  const t = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Tìm chapter đang active dựa trên currentTime (ms) */
function findActiveChapter(chapters, currentMs, partDurationMs) {
  return (
    chapters.find((ch) => {
      const end =
        ch.endMs !== null && ch.endMs !== undefined ? ch.endMs : partDurationMs;
      return currentMs >= ch.startMs && currentMs < end;
    }) ?? null
  );
}

/** Biến parts thành hàng đợi phát nội bộ, giữ nguyên contract backend. */
function buildPlaybackQueue(parts = []) {
  return parts.map((part, partIndex) => ({
    ...part,
    partIndex,
    chapters: Array.isArray(part.chapters) ? part.chapters : [],
  }));
}

/** Flatten parts[].chapters để điều hướng qua toàn bộ sách nói. */
function flattenChapters(queue) {
  return queue.flatMap((part) =>
    part.chapters.map((chapter) => ({
      ...chapter,
      playbackKey: `${part.partIndex}:${chapter.id ?? chapter.sequence ?? chapter.startMs}`,
      partId: part.id,
      partIndex: part.partIndex,
      partTitle: part.title || `Phần ${part.partNumber ?? part.partIndex + 1}`,
      partDurationMs: part.durationMs,
    })),
  );
}

function isIndexChapter(chapter) {
  return /_000(?:\.[^.]+)?$/.test(chapter.partTitle ?? "");
}

// ─── Component ───────────────────────────────────────────────────────────────

function AudiobookPlayer({ bookId }) {
  const { user } = useAuth();
  // ── API state ──
  const [catalog, setCatalog] = useState(null); // dữ liệu từ /api/books/:id/audio
  const [fetchError, setFetchError] = useState(null); // lỗi server thực sự (5xx)
  const [audioUnavailable, setAudioUnavailable] = useState(null); // 401/403/404/no-parts
  const [isFetching, setIsFetching] = useState(true);

  // Custom navigation hook for routing
  const navigate = useNavigate();

  // Consume global audio context for mini player synchronization
  const { isMini, setIsMini, updateMiniData } = useAudio();

  // ── Player state ──
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [showChapters, setShowChapters] = useState(true);

  const audioRef = useRef(null);
  const pendingChapterRef = useRef(null);
  const shouldAutoPlayRef = useRef(false);

  // ── 1. Fetch audiobook catalog từ backend ──────────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    setIsFetching(true);
    setFetchError(null);
    setCatalog(null);
    setAudioUnavailable(null);

    if (!user) {
      setAudioUnavailable("Vui lòng đăng nhập để nghe sách nói.");
      setIsFetching(false);
      return;
    }

    fetch(`/api/books/${bookId}/audio`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          setAudioUnavailable("Vui lòng đăng nhập để nghe sách nói.");
          return null;
        }
        if (res.status === 403) {
          setAudioUnavailable("Bạn chưa có quyền truy cập sách nói này.");
          return null;
        }
        if (res.status === 404) {
          setAudioUnavailable("Sách nói hiện chưa khả dụng.");
          return null;
        }
        if (!res.ok) throw new Error(`Lỗi máy chủ: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data) {
          setIsFetching(false);
          return;
        }
        if (!data?.parts?.length) {
          setAudioUnavailable("Sách nói hiện chưa có dữ liệu phát.");
          setIsFetching(false);
          return;
        }
        setCatalog(data);
        setIsFetching(false);
      })
      .catch((err) => {
        console.error("[AudiobookPlayer] fetch catalog error:", err);
        setFetchError(err.message);
        setIsFetching(false);
      });
  }, [bookId, user]);

  // ── 2. Reset khi đổi part ──────────────────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current) return;
    const pendingChapter = pendingChapterRef.current;
    const nextTime =
      pendingChapter?.partIndex === activePartIndex
        ? pendingChapter.startMs / 1000
        : 0;

    audioRef.current.currentTime = nextTime;
    setDuration(0);
    setCurrentTime(nextTime);
    setIsPlaying(shouldAutoPlayRef.current);
    setStreamError(null);
    // crossOrigin phải set trước khi load
    audioRef.current.crossOrigin = "use-credentials";
  }, [activePartIndex]);

  // ── 3. Sync volume / mute ──────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ── 4. Sync tốc độ phát ────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleTogglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      setStreamError(null);
      el.play().catch((err) => {
        console.error("[AudiobookPlayer] play error:", err);
        setStreamError("Không thể phát âm thanh. Vui lòng thử lại sau.");
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (val) => {
    setCurrentTime(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const handleChapterClick = (chapter) => {
    pendingChapterRef.current = chapter;
    setStreamError(null);

    if (chapter.partIndex !== activePartIndex) {
      shouldAutoPlayRef.current = true;
      setActivePartIndex(chapter.partIndex);
      return;
    }

    const seekSecs = chapter.startMs / 1000;
    handleSeek(seekSecs);
    shouldAutoPlayRef.current = true;
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("[AudiobookPlayer] chapter play error:", err);
          setStreamError("Không thể phát âm thanh. Vui lòng thử lại sau.");
        });
    }
  };

  /**
   * Enables mini player mode and redirects the user back to the homepage.
   */
  const handleMinimizeAndGoHome = () => {
    // 1. Activate mini player floating component globally
    setIsMini(true);

    // 2. Navigate back to home route
    if (typeof navigate === "function") {
      navigate("/");
    } else {
      window.location.hash = "/";
    }
  };

  // ─── Audio element event handlers ──────────────────────────────────────────

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };
  const onLoadedMeta = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      setDuration(isFinite(d) ? d : (activePart?.durationMs ?? 0) / 1000);

      const pendingChapter = pendingChapterRef.current;
      if (pendingChapter?.partIndex === activePartIndex) {
        const seekSecs = pendingChapter.startMs / 1000;
        audioRef.current.currentTime = seekSecs;
        setCurrentTime(seekSecs);
        pendingChapterRef.current = null;
      }

      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        audioRef.current.play().catch((err) => {
          console.error("[AudiobookPlayer] autoplay error:", err);
          setStreamError(
            "Không thể tự động phát phần tiếp theo. Vui lòng nhấn phát để tiếp tục.",
          );
          setIsPlaying(false);
        });
      }
    }
    setIsBuffering(false);
  };
  const onWaiting = () => setIsBuffering(true);
  const onPlaying = () => setIsBuffering(false);
  const onCanPlay = () => setIsBuffering(false);
  const onLoadStart = () => setIsBuffering(true);
  const onError = () => {
    setIsBuffering(false);
    setStreamError(
      "Lỗi tải luồng âm thanh. Kiểm tra kết nối mạng hoặc thử lại.",
    );
  };
  const onEnded = () => {
    if (activePartIndex < playbackQueue.length - 1) {
      pendingChapterRef.current = null;
      shouldAutoPlayRef.current = true;
      setActivePartIndex((idx) => idx + 1);
      return;
    }
    setIsPlaying(false);
  };

  // ─── Derived values ─────────────────────────────────────────────────────────

  const playbackQueue = buildPlaybackQueue(catalog?.parts);
  const flattenedChapters = flattenChapters(playbackQueue);
  const indexChapters = flattenedChapters.filter(isIndexChapter);
  const activePart = playbackQueue[activePartIndex] ?? null;
  const currentMs = currentTime * 1000;
  const activeChapter = activePart
    ? findActiveChapter(
        indexChapters.filter((ch) => ch.partIndex === activePartIndex),
        currentMs,
        activePart.durationMs,
      )
    : null;
  const activeChapterKey = activeChapter?.playbackKey ?? null;

  useEffect(() => {
    if (typeof updateMiniData === "function") {
      updateMiniData({
        bookId,
        title: catalog?.title || "Sách nói DAISY",
        chapterTitle: activeChapter?.title || "Đang phát...",
        isPlaying,
        currentTime,
        duration,
        streamUrl: activePart?.streamUrl,
        onTogglePlay: handleTogglePlay,
      });
    }
  }, [catalog, activeChapter, isPlaying, currentTime, duration]);

  useAudioHotkeys({
    isPlaying,
    audioRef,
    volume,
    setVolume,
    setIsMuted,
    speed,
    setSpeed,
    indexChapters,
    activeChapterKey,
    handleTogglePlay,
    handleChapterClick,
    onToggleMiniPlayer: () => setIsMini((prev) => !prev),
  });

  // ─── Render states ──────────────────────────────────────────────────────────

  if (isFetching) {
    return (
      <section
        className="audiobook-player-section"
        aria-label="Trình phát sách nói"
      >
        <div className="player-main-header">
          <Headphones size={22} />
          <h2>Trình phát Sách nói DAISY</h2>
        </div>
        <div className="player-loading" aria-live="polite">
          <Loader2 size={18} />
          <span>Đang tải dữ liệu sách nói...</span>
        </div>
      </section>
    );
  }

  if (audioUnavailable) {
    return (
      <section
        className="audiobook-player-section"
        aria-label="Trình phát sách nói"
      >
        <div className="player-main-header">
          <Headphones size={22} />
          <h2>Trình phát Sách nói DAISY</h2>
        </div>
        <div className="player-empty" role="status">
          <Headphones size={18} />
          <span>{audioUnavailable}</span>
        </div>
      </section>
    );
  }

  if (fetchError) {
    return (
      <section
        className="audiobook-player-section"
        aria-label="Trình phát sách nói"
      >
        <div className="player-main-header">
          <Headphones size={22} />
          <h2>Trình phát Sách nói DAISY</h2>
        </div>
        <div className="player-error">
          <AlertCircle size={16} />
          <span>{fetchError}</span>
        </div>
      </section>
    );
  }

  if (!catalog || !activePart) return null;

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <section
      className="audiobook-player-section"
      aria-label="Trình phát sách nói"
    >
      {/* Header */}
      <div
        className="player-main-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Headphones size={22} />
          <h2>Trình phát Sách nói DAISY</h2>
        </div>

        {/* Minimize button to toggle mini mode and navigate home */}
        <button
          onClick={handleMinimizeAndGoHome}
          className="btn-minimize"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "transparent",
            border: "1px solid #d1d5db",
            padding: "5px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "#374151",
            fontWeight: 500,
          }}
        >
          <Minimize2 size={15} /> Thu nhỏ
        </button>
      </div>

      {/* Stream error banner */}
      {streamError && (
        <div className="player-error" role="alert">
          <AlertCircle size={16} />
          <span>{streamError}</span>
        </div>
      )}

      {/* Hidden <audio> element */}
      <audio
        ref={audioRef}
        key={activePart.id} /* re-mount khi đổi part để load src mới */
        src={activePart.streamUrl}
        crossOrigin="use-credentials"
        preload="metadata"
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMeta}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onCanPlay={onCanPlay}
        onLoadStart={onLoadStart}
        onError={onError}
        onEnded={onEnded}
      />

      {/* Controls row: Play/Pause | Volume | Speed */}
      <div className="audio-controls-row">
        <PlayerControls
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          onTogglePlay={handleTogglePlay}
        />
        <div className="volume-speed-control">
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={() => setIsMuted((m) => !m)}
          />
          <SpeedControl speed={speed} onSpeedChange={setSpeed} />
        </div>
      </div>

      {/* Timeline (seek bar) */}
      <PlayerTimeline
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        formatTime={formatTime}
      />

      {/* Chapter list với toggle */}
      <div>
        <button
          className="chapters-title-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            font: "inherit",
            padding: 0,
          }}
          onClick={() => setShowChapters((v) => !v)}
          aria-expanded={showChapters}
          aria-controls="chapters-panel"
        >
          <span>Danh sách chương ({indexChapters.length})</span>
          {showChapters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showChapters && (
          <div id="chapters-panel">
            <ChapterList
              chapters={indexChapters}
              partDurationMs={activePart.durationMs}
              activeChapterId={activeChapterKey}
              onChapterClick={handleChapterClick}
              formatTime={formatTime}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default AudiobookPlayer;
