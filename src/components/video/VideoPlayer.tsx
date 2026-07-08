import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
}

export function VideoPlayer({ videoUrl, thumbnailUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const [showPoster, setShowPoster] = useState(true);
  const [playError, setPlayError] = useState(false);

  const [hlsLevels, setHlsLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is Auto

  // Setup HLS or Native player
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;

    const isM3U8 = videoUrl.includes(".m3u8");
    const isMP4 = videoUrl.includes(".mp4");

    console.log("Final URL passed to player:", videoUrl);
    console.log("Format detected - isM3U8:", isM3U8, "isMP4:", isMP4);

    const handleLoadedMetadata = () => {
      setLoading(false);
      const savedTime = localStorage.getItem(`vid_time_${videoUrl}`);
      if (savedTime) {
        const parsed = parseFloat(savedTime);
        if (Number.isFinite(parsed) && parsed >= 0) {
          video.currentTime = parsed;
        }
      }
    };

    const handleError = (e: Event) => {
      console.error(
        "Player Error Event:",
        e,
        video.error?.code,
        video.error?.message,
      );
      setError("Error loading video source");
    };

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setHlsLevels(data.levels);
        setLoading(false);
        // Load saved time
        const savedTime = localStorage.getItem(`vid_time_${videoUrl}`);
        if (savedTime) {
          const parsed = parseFloat(savedTime);
          if (Number.isFinite(parsed) && parsed >= 0) {
            video.currentTime = parsed;
          }
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              console.error("HLS Fatal Error:", data);
              setError("A fatal error occurred during playback");
              break;
          }
        }
      });
    } else {
      // Native HLS (Safari) or standard MP4
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("error", handleError);

      video.src = videoUrl;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
    };
  }, [videoUrl]);

  // Save progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && currentTime > 0) {
        localStorage.setItem(`vid_time_${videoUrl}`, currentTime.toString());
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentTime, videoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const targetTime = pos * duration;
      if (Number.isFinite(targetTime) && targetTime >= 0) {
        videoRef.current.currentTime = targetTime;
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) setVolume(0);
      else setVolume(1);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.error("PiP error:", err);
      }
    }
  };

  const changeQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentLevel(level);
      setShowSettings(false);
    }
  };

  const changeSpeed = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSettings(false);
    }
  };

  let controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) setShowControls(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <div className="w-full aspect-video bg-neutral-900 rounded-xl flex flex-col items-center justify-center text-red-500 border border-neutral-800">
        <AlertCircle className="w-10 h-10 mb-2" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="video-player-container relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-neutral-800 group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setShowPoster(true);
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onClick={togglePlay}
        controlsList="nodownload"
        disablePictureInPicture={false}
      />

      {showPoster && (
        <div 
          className="absolute inset-0 z-30 cursor-pointer group/poster overflow-hidden bg-neutral-900"
          onClick={async () => {
            if (videoRef.current) {
              try {
                setPlayError(false);
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  await playPromise;
                }
                setShowPoster(false);
                setIsPlaying(true);
              } catch (err) {
                console.error("Playback failed:", err);
                setPlayError(true);
              }
            }
          }}
        >
          {thumbnailUrl && (
            <img 
              src={thumbnailUrl} 
              alt="Video poster" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/poster:scale-105"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-red-600/90 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-600/50 transform transition-all duration-300 group-hover/poster:scale-110 group-hover/poster:bg-red-500 backdrop-blur-sm border-2 border-red-500/50">
              <Play className="w-10 h-10 ml-2" fill="currentColor" />
            </div>
            {playError && (
              <div className="mt-4 px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-lg font-medium border border-red-500/50 animate-pulse">
                Tap to Play Again
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {!showPoster && (
        <div
          className={`absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 cursor-none"}`}
        >
          <div className="p-4 flex flex-col gap-2 w-full">
            {/* Progress Bar */}
            <div
              ref={progressRef}
              className="w-full h-1.5 bg-neutral-600/50 rounded-full cursor-pointer group/progress relative"
              onClick={handleProgressClick}
            >
              <div
                className="absolute top-0 left-0 h-full bg-red-600 rounded-full group-hover/progress:bg-red-500 transition-colors"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
              {/* Scrubber thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{
                  left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)`,
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-red-500 transition-colors focus:outline-none"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>

                <div className="flex items-center gap-2 group/volume">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-red-500 transition-colors focus:outline-none"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover/volume:w-20 transition-all duration-300 opacity-0 group-hover/volume:opacity-100 accent-red-600 h-1"
                  />
                </div>

                <div className="text-white text-xs font-medium font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-4 relative">
                <button
                  onClick={togglePiP}
                  className="text-white hover:text-red-500 transition-colors focus:outline-none"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:text-red-500 transition-colors focus:outline-none"
                >
                  <Settings
                    className={`w-5 h-5 ${showSettings ? "rotate-90" : ""} transition-transform`}
                  />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-red-500 transition-colors focus:outline-none"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>

                {/* Settings Menu */}
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-lg shadow-xl p-2 min-w-[160px] text-sm z-20">
                    <div className="mb-2">
                      <div className="text-neutral-400 text-xs font-semibold px-2 mb-1 uppercase tracking-wider">
                        Speed
                      </div>
                      {[0.5, 1, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`w-full text-left px-2 py-1.5 rounded hover:bg-neutral-800 transition-colors ${playbackRate === rate ? "text-red-500 font-medium" : "text-white"}`}
                        >
                          {rate === 1 ? "Normal" : `${rate}x`}
                        </button>
                      ))}
                    </div>

                    {hlsLevels.length > 0 && (
                      <div className="pt-2 border-t border-neutral-800">
                        <div className="text-neutral-400 text-xs font-semibold px-2 mb-1 uppercase tracking-wider">
                          Quality
                        </div>
                        <button
                          onClick={() => changeQuality(-1)}
                          className={`w-full text-left px-2 py-1.5 rounded hover:bg-neutral-800 transition-colors ${currentLevel === -1 ? "text-red-500 font-medium" : "text-white"}`}
                        >
                          Auto
                        </button>
                        {hlsLevels.map((level, index) => (
                          <button
                            key={index}
                            onClick={() => changeQuality(index)}
                            className={`w-full text-left px-2 py-1.5 rounded hover:bg-neutral-800 transition-colors ${currentLevel === index ? "text-red-500 font-medium" : "text-white"}`}
                          >
                            {level.height}p
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
