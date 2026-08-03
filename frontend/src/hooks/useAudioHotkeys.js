import { useEffect } from "react";

/**
 * Speech synthesis helper to announce actions for visually impaired users.
 */
function speakFeedback(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * Trigger UI button click by matching its text content.
 */
function triggerButtonByText(targetText, feedbackMsg) {
  const buttons = Array.from(document.querySelectorAll("button"));
  const btn = buttons.find((b) => b.textContent.includes(targetText));
  if (btn) {
    btn.click();
    speakFeedback(feedbackMsg);
  } else {
    speakFeedback(`Đã ${targetText}`);
  }
}

const SPEED_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

/**
 * Custom hook to handle global keyboard shortcuts for screen readers and accessibility.
 * Maps hotkeys (*, /, Enter, Space, Arrows, Numpad +/-, Ctrl) to audiobook player controls.
 */
export function useAudioHotkeys({
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
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent hotkeys while typing in inputs or textareas
      const activeEl = document.activeElement;
      if (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        // Space: Play / Pause
        case "Space":
          e.preventDefault();
          handleTogglePlay();
          break;

        // ArrowUp: Volume +10%
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => {
            const nextV = Math.min(v + 0.1, 1.0);
            speakFeedback(`Âm lượng ${Math.round(nextV * 100)} percent`);
            return nextV;
          });
          setIsMuted(false);
          break;

        // ArrowDown: Volume -10%
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => {
            const nextV = Math.max(v - 0.1, 0);
            speakFeedback(`Âm lượng ${Math.round(nextV * 100)} percent`);
            return nextV;
          });
          break;

        // ArrowRight: Speed up
        case "ArrowRight":
          e.preventDefault();
          setSpeed((curr) => {
            const idx = SPEED_STEPS.indexOf(curr);
            const nextSpeed =
              idx < SPEED_STEPS.length - 1 ? SPEED_STEPS[idx + 1] : curr;
            speakFeedback(`Tốc độ ${nextSpeed} lần`);
            return nextSpeed;
          });
          break;

        // ArrowLeft: Slow down
        case "ArrowLeft":
          e.preventDefault();
          setSpeed((curr) => {
            const idx = SPEED_STEPS.indexOf(curr);
            const nextSpeed = idx > 0 ? SPEED_STEPS[idx - 1] : curr;
            speakFeedback(`Tốc độ ${nextSpeed} lần`);
            return nextSpeed;
          });
          break;

        // Numpad +: Next chapter
        case "NumpadAdd":
          e.preventDefault();
          if (indexChapters && indexChapters.length > 0) {
            const currentIdx = indexChapters.findIndex(
              (c) => c.playbackKey === activeChapterKey,
            );
            if (currentIdx < indexChapters.length - 1) {
              handleChapterClick(indexChapters[currentIdx + 1]);
            } else {
              speakFeedback("Đã ở chương cuối cùng");
            }
          }
          break;

        // Numpad - or Minus: Previous chapter
        case "NumpadSubtract":
        case "Minus":
          e.preventDefault();
          if (indexChapters && indexChapters.length > 0) {
            const currentIdx = indexChapters.findIndex(
              (c) => c.playbackKey === activeChapterKey,
            );
            if (currentIdx > 0) {
              handleChapterClick(indexChapters[currentIdx - 1]);
            } else {
              speakFeedback("Đã ở chương đầu tiên");
            }
          }
          break;

        // Numpad *: Add to library
        case "NumpadMultiply":
          e.preventDefault();
          triggerButtonByText("Thêm vào thư viện", "Đã bấm Thêm vào thư viện");
          break;

        // Slash (/): Favorite
        case "NumpadDivide":
        case "Slash":
          e.preventDefault();
          triggerButtonByText("Yêu thích", "Đã bấm Yêu thích");
          break;

        // Enter: Download book
        case "Enter":
          e.preventDefault();
          triggerButtonByText("Tải xuống sách", "Đã bấm Tải xuống sách");
          break;

        // Ctrl: Toggle mini player
        case "ControlLeft":
        case "ControlRight":
          e.preventDefault();
          speakFeedback("Chức năng thu nhỏ cửa sổ đang phát triển");
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPlaying,
    activeChapterKey,
    indexChapters,
    handleTogglePlay,
    handleChapterClick,
    setVolume,
    setIsMuted,
    setSpeed,
  ]);
}
