import React, { createContext, useContext, useState, useRef } from "react";
import MiniAudioPlayer from "../components/MiniAudioPlayer";
import { useNavigate } from "../navigation";

// Create Audio Context for global player management
const AudioContext = createContext();

export function AudioProvider({ children }) {
  const navigate = useNavigate();
  const [isMini, setIsMini] = useState(false);
  const [miniData, setMiniData] = useState({
    bookId: null,
    title: "",
    chapterTitle: "",
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    streamUrl: "",
    onTogglePlay: () => {},
  });

  const globalAudioRef = useRef(null);

  /**
   * Update mini player metadata from AudiobookPlayer component
   * @param {Object} data - Audio status and details
   */
  const updateMiniData = (data) => {
    setMiniData((prev) => ({ ...prev, ...data }));
  };

  /**
   * Handle play/pause toggle for global audio
   */
  const handleGlobalTogglePlay = () => {
    if (miniData.onTogglePlay) {
      miniData.onTogglePlay();
    }
  };

  /**
   * Expand mini player: hide mini mode and redirect back to book detail page
   */
  const handleExpandAndGoBack = () => {
    setIsMini(false);
    if (miniData.bookId) {
      if (typeof navigate === "function") {
        navigate(`/book/${miniData.bookId}`);
      } else {
        window.location.hash = `/book/${miniData.bookId}`;
      }
    }
  };

  return (
    <AudioContext.Provider value={{ isMini, setIsMini, updateMiniData }}>
      {children}

      {/* Floating Mini Player rendered at the root app level */}
      {isMini && (
        <>
          {/* Global audio element ensuring uninterrupted playback during route changes */}
          {miniData.streamUrl && (
            <audio
              ref={globalAudioRef}
              src={miniData.streamUrl}
              autoPlay={miniData.isPlaying}
              onTimeUpdate={() => {
                if (globalAudioRef.current) {
                  setMiniData((prev) => ({
                    ...prev,
                    currentTime: globalAudioRef.current.currentTime,
                  }));
                }
              }}
            />
          )}

          <MiniAudioPlayer
            title={miniData.title}
            chapterTitle={miniData.chapterTitle}
            isPlaying={miniData.isPlaying}
            currentTime={miniData.currentTime}
            duration={miniData.duration}
            onTogglePlay={handleGlobalTogglePlay}
            onExpand={handleExpandAndGoBack}
            onClose={() => setIsMini(false)}
          />
        </>
      )}
    </AudioContext.Provider>
  );
}

// Custom hook to consume Audio Context
export const useAudio = () => useContext(AudioContext);
