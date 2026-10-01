import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

interface VideoPlayerProps {
  videoId?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  previewStoryboardUrl?: string;
  previewStoryboardData?: {
    interval: number;
    rows: number;
    cols: number;
    width: number;
    height: number;
  };
}

// Safe storage access that never crashes in restricted or iframe environments
function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage errors safely
  }
  return null;
}

function safeSetStorage(key: string, val: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
  } catch {
    // Ignore storage errors safely
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  videoId,
  previewStoryboardUrl,
  previewStoryboardData,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // View tracking refs
  const accumulatedPlayTime = useRef(0);
  const lastTimeRef = useRef(0);
  const viewReported = useRef(false);

  // Player state
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Controls state
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(() => {
    const savedVol = safeGetStorage("player_volume");
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
    return 1;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Seeking & Hover state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState(0); // 0 to 1
  const [hoverPos, setHoverPos] = useState(0); // 0 to 1
  const [isHovering, setIsHovering] = useState(false);

  // Reset all states when video changes
  useEffect(() => {
    // Stop and clear previous video safely
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      } catch {
        // Safe fallback
      }
    }

    setHasStarted(false);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setError(null);
    setShowSettings(false);
    setShowControls(true);
    setIsDragging(false);
    setIsHovering(false);

    accumulatedPlayTime.current = 0;
    lastTimeRef.current = 0;
    viewReported.current = false;

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, [videoUrl, videoId]);

  // Sync volume with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document === "undefined") return;
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Periodic watch progress saver
  useEffect(() => {
    if (!hasStarted || !videoUrl || currentTime <= 0) return;
    const timer = setInterval(() => {
      if (currentTime > 0) {
        safeSetStorage(`vid_time_${videoUrl}`, currentTime.toFixed(1));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [hasStarted, videoUrl, currentTime]);

  // Auto-hide controls timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !showSettings && !isDragging) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, showSettings, isDragging]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSettings && !isDragging) {
      setShowControls(false);
    }
  };

  // Start playback (lazy loading trigger)
  const handleStartPlay = async () => {
    if (!videoRef.current || !videoUrl) return;
    setError(null);
    setIsLoading(true);
    setHasStarted(true);

    const video = videoRef.current;
    if (!video.src || video.src !== videoUrl) {
      video.src = videoUrl;
      try {
        video.load();
      } catch {
        // Safe fallback
      }
    }

    try {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      setIsPlaying(true);
      setIsLoading(false);
      resetControlsTimeout();
    } catch (err: any) {
      // Browser autoplay policy or media error
      if (err?.name !== "AbortError") {
        console.warn("Playback error or autoplay blocked:", err);
      }
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!hasStarted) {
      handleStartPlay();
      return;
    }
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          resetControlsTimeout();
        })
        .catch((err) => {
          console.warn("Play error:", err);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  // HTML5 Video Event Handlers
  const handleLoadedMetadata = () => {
    setIsLoading(false);
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur);
    }

    // Restore saved playback time safely if applicable
    const savedTime = safeGetStorage(`vid_time_${videoUrl}`);
    if (savedTime) {
      const parsed = parseFloat(savedTime);
      if (Number.isFinite(parsed) && parsed > 0 && parsed < (dur || Infinity) - 5) {
        try {
          videoRef.current.currentTime = parsed;
          setCurrentTime(parsed);
        } catch {
          // Ignore seek error
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const current = video.currentTime;

    if (!isDragging) {
      setCurrentTime(current);
    }

    if (Number.isFinite(video.duration) && video.duration > 0 && duration === 0) {
      setDuration(video.duration);
    }

    // Update buffered progress
    if (video.buffered && video.buffered.length > 0) {
      for (let i = video.buffered.length - 1; i >= 0; i--) {
        if (video.buffered.start(i) <= current) {
          setBufferedEnd(video.buffered.end(i));
          break;
        }
      }
    }

    // View tracking logic - tracks view once per video instance after 4s real watch time
    if (videoId && !viewReported.current && !video.paused) {
      const diff = current - lastTimeRef.current;
      if (diff > 0 && diff < 1.0) {
        accumulatedPlayTime.current += diff;
      }
      if (accumulatedPlayTime.current >= 4) {
        viewReported.current = true;
        const storageKey = `viewed_${videoId}`;
        const lastViewedStr = safeGetStorage(storageKey);
        const now = Date.now();
        let shouldReport = true;
        if (lastViewedStr) {
          const lastViewed = parseInt(lastViewedStr, 10);
          if (!isNaN(lastViewed) && now - lastViewed < 24 * 60 * 60 * 1000) {
            shouldReport = false;
          }
        }

        if (shouldReport) {
          fetch(`/api/video/${videoId}/view`, { method: "POST" })
            .then((res) => {
              if (res.ok) {
                safeSetStorage(storageKey, now.toString());
              } else {
                viewReported.current = false;
              }
            })
            .catch(() => {
              viewReported.current = false;
            });
        }
      }
    }
    lastTimeRef.current = current;
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setIsPlaying(false);
    const mediaErr = videoRef.current?.error;
    let msg = "Unable to load video. Please try again.";
    if (mediaErr) {
      if (mediaErr.code === MediaError.MEDIA_ERR_NETWORK) {
        msg = "Network error while loading video.";
      } else if (mediaErr.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        msg = "The video format or source is not supported.";
      } else if (mediaErr.code === MediaError.MEDIA_ERR_DECODE) {
        msg = "A decoding error occurred while playing the video.";
      }
    }
    setError(msg);
  };

  // Timeline Drag & Seek Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture unsupported
    }
    setIsDragging(true);
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setDragPos(pos);
    setCurrentTime(pos * duration);
    resetControlsTimeout();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (isDragging) {
      setDragPos(pos);
      setCurrentTime(pos * duration);
      resetControlsTimeout();
    } else {
      setHoverPos(pos);
      setIsHovering(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setIsDragging(false);
      if (progressRef.current && videoRef.current && duration > 0) {
        const rect = progressRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetTime = pos * duration;
        if (Number.isFinite(targetTime) && targetTime >= 0) {
          videoRef.current.currentTime = targetTime;
          setCurrentTime(targetTime);
        }
      }
      resetControlsTimeout();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setIsDragging(false);
    }
    setIsHovering(false);
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setIsHovering(false);
    }
  };

  // Storyboard styles calculation
  const getStoryboardStyles = () => {
    if (!previewStoryboardData || !previewStoryboardUrl || duration <= 0) return {};
    const { interval, cols, rows, width, height } = previewStoryboardData;
    const activePos = isDragging ? dragPos : hoverPos;
    const targetTime = activePos * duration;

    const totalFrames = cols * rows;
    let frameIndex = Math.floor(targetTime / interval);
    frameIndex = Math.max(0, Math.min(frameIndex, totalFrames - 1));

    const r = Math.floor(frameIndex / cols);
    const c = frameIndex % cols;

    return {
      backgroundImage: `url(${previewStoryboardUrl})`,
      backgroundPosition: `-${c * width}px -${r * height}px`,
      width: `${width}px`,
      height: `${height}px`,
      backgroundSize: `${cols * width}px ${rows * height}px`,
    };
  };

  // Volume Handlers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    safeSetStorage("player_volume", val.toString());
    if (val === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setIsMuted(false);
      if (volume === 0) {
        setVolume(1);
        safeSetStorage("player_volume", "1");
      }
    } else {
      setIsMuted(true);
    }
  };

  // Fullscreen Handlers
  const toggleFullscreen = async () => {
    if (!containerRef.current || typeof document === "undefined") return;
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current || typeof document === "undefined") return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP error:", err);
    }
  };

  // Playback speed
  const changeSpeed = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSettings(false);
    }
  };

  // Seek +/- 10s keyboard support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "f") {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === "m") {
      e.preventDefault();
      toggleMute();
    } else if (e.key === "ArrowLeft" && videoRef.current) {
      e.preventDefault();
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    } else if (e.key === "ArrowRight" && videoRef.current) {
      e.preventDefault();
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
    }
  };

  // Percentages for timeline
  const activePosition = isDragging
    ? dragPos
    : duration > 0
    ? currentTime / duration
    : 0;
  const playedPercent = Math.max(0, Math.min(100, activePosition * 100));
  const bufferedPercent =
    duration > 0 ? Math.max(0, Math.min(100, (bufferedEnd / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="video-player-container relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl select-none outline-none group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={resetControlsTimeout}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Native Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        preload="none"
        playsInline
        webkit-playsinline="true"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onError={handleVideoError}
        onClick={togglePlay}
        controlsList="nodownload"
        disablePictureInPicture={false}
      />

      {/* Initial Lazy Poster & Centered Big Play Button */}
      {!hasStarted && (
        <div
          className="absolute inset-0 z-30 cursor-pointer overflow-hidden bg-neutral-950 flex items-center justify-center group/poster"
          onClick={handleStartPlay}
        >
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover/poster:scale-105"
              referrerPolicy="no-referrer"
              loading="eager"
            />
          )}

          {/* Dark Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 group-hover/poster:via-black/20 transition-colors" />

          {/* Centered Large Play Button */}
          <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 transform scale-95 group-hover/poster:scale-105">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-primary/95 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(229,9,20,0.5)] border border-white/30 backdrop-blur-md transition-all duration-300 group-hover/poster:bg-primary group-hover/poster:shadow-[0_0_60px_rgba(229,9,20,0.8)]">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ml-1 sm:ml-1.5" fill="currentColor" />
            </div>
            <span className="mt-3.5 px-4 py-1.5 bg-black/70 backdrop-blur-md text-white/90 text-xs sm:text-sm font-semibold rounded-full border border-white/10 tracking-wide shadow-lg">
              Click to Watch
            </span>
          </div>
        </div>
      )}

      {/* Loading & Buffering Indicator */}
      {isLoading && hasStarted && !error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-[2px] transition-opacity duration-200 pointer-events-none"
          aria-label="Buffering video"
        >
          <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4">
            <div className="absolute inset-0 rounded-full border border-primary/60 animate-desired-ring-1" />
            <div className="absolute inset-0 rounded-full border border-primary/40 animate-desired-ring-2" />
            <div className="absolute -inset-1.5 rounded-full border border-transparent border-t-primary/90 border-l-primary/40 animate-desired-spin" />
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(229,9,20,0.7)] animate-desired-glow">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-white/90 text-xs sm:text-sm font-semibold tracking-wider uppercase">
            <span>Loading</span>
            <span className="animate-desired-dot-1 text-primary">•</span>
            <span className="animate-desired-dot-2 text-primary">•</span>
            <span className="animate-desired-dot-3 text-primary">•</span>
          </div>
        </div>
      )}

      {/* Error Message Box */}
      {error && (
        <div className="absolute inset-0 z-40 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3 shadow-lg">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-white font-semibold text-base sm:text-lg mb-1">Playback Error</h3>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-md mb-4">{error}</p>
          <button
            onClick={handleStartPlay}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-red-600 text-white font-medium text-xs sm:text-sm rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Playback
          </button>
        </div>
      )}

      {/* Control Overlay */}
      {hasStarted && !error && (
        <div
          className={`absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-300 pointer-events-none ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="p-3 sm:p-5 flex flex-col gap-2.5 w-full pointer-events-auto">
            {/* Timeline Progress Bar Container */}
            <div
              ref={progressRef}
              className="w-full h-4 sm:h-5 flex items-center cursor-pointer group/progress relative select-none touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerLeave}
            >
              {/* Hover / Scrubbing Preview Tooltip */}
              {(isDragging || isHovering) && duration > 0 && (
                <div
                  className="absolute bottom-full mb-3 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 transition-transform duration-75"
                  style={{
                    left: `clamp(${
                      previewStoryboardData ? previewStoryboardData.width / 2 + 8 : 40
                    }px, ${(isDragging ? dragPos : hoverPos) * 100}%, calc(100% - ${
                      previewStoryboardData ? previewStoryboardData.width / 2 + 8 : 40
                    }px))`,
                  }}
                >
                  {previewStoryboardData && previewStoryboardUrl && (
                    <div className="rounded-lg overflow-hidden border border-white/20 shadow-2xl bg-black mb-1.5 ring-1 ring-black/50">
                      <div style={getStoryboardStyles()} />
                    </div>
                  )}
                  <div className="bg-black/90 backdrop-blur-md text-white text-[11px] sm:text-xs font-mono font-semibold px-2.5 py-1 rounded-md border border-white/10 shadow-xl whitespace-nowrap">
                    {formatTime((isDragging ? dragPos : hoverPos) * duration)}
                  </div>
                </div>
              )}

              {/* Progress Background Track */}
              <div className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden relative transition-all group-hover/progress:h-2 sm:group-hover/progress:h-2.5">
                {/* Buffered Indicator Bar */}
                <div
                  className="absolute top-0 left-0 h-full bg-white/35 rounded-full transition-[width] duration-200"
                  style={{ width: `${bufferedPercent}%` }}
                />
                {/* Played Progress Bar */}
                <div
                  className="absolute top-0 left-0 h-full bg-primary rounded-full"
                  style={{ width: `${playedPercent}%` }}
                />
              </div>

              {/* Progress Scrubber Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)] border border-primary transition-transform duration-100 ease-out group-hover/progress:scale-125 pointer-events-none"
                style={{
                  left: `${playedPercent}%`,
                  opacity: playedPercent > 0 || isHovering || isDragging ? 1 : 0,
                }}
              />
            </div>

            {/* Bottom Bar: Action Buttons & Meta */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
              {/* Left Controls: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-3 sm:gap-5">
                {/* Play / Pause Button */}
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="text-white/90 hover:text-white hover:scale-110 active:scale-95 transition-all p-1 rounded-lg focus:outline-none"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                  )}
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={toggleMute}
                    aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                    className="text-white/90 hover:text-white hover:scale-110 active:scale-95 transition-all p-1 rounded-lg focus:outline-none"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>

                  <div className="w-16 sm:w-20 md:w-24 flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Volume slider"
                      className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Time Display */}
                <div className="text-white/90 text-xs sm:text-sm font-mono font-medium whitespace-nowrap tracking-wide select-none">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-white/40 mx-1">/</span>
                  <span className="text-white/60">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Controls: PiP, Speed Settings, Fullscreen */}
              <div className="flex items-center gap-2.5 sm:gap-4 relative">
                {/* Picture in Picture */}
                <button
                  onClick={togglePiP}
                  aria-label="Picture in Picture"
                  title="Picture in Picture"
                  className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all p-1.5 rounded-lg focus:outline-none hidden sm:block"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>

                {/* Settings & Speed Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    aria-label="Playback Settings"
                    title="Settings"
                    className={`text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all p-1.5 rounded-lg focus:outline-none ${
                      showSettings ? "rotate-90 text-primary" : ""
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-3 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-xl shadow-2xl p-2.5 min-w-[170px] text-xs z-40 origin-bottom-right">
                      <div className="text-neutral-400 font-bold px-3 py-1 uppercase tracking-wider text-[10px]">
                        Playback Speed
                      </div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                            playbackRate === rate
                              ? "bg-primary/20 text-primary font-semibold"
                              : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                          }`}
                        >
                          <span>{rate === 1 ? "Normal" : `${rate}x`}</span>
                          {playbackRate === rate && <span className="text-primary font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
                  className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all p-1.5 rounded-lg focus:outline-none"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Maximize className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

