import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2
} from 'lucide-react';
import { Video } from '../../types';

interface VideoPlayerProps {
  video?: Video;
  // Optional backward-compatibility props if invoked directly with individual fields
  videoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  previewStoryboardUrl?: string;
  previewStoryboardData?: any;
  onViewIncrement?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  videoId,
  videoUrl,
  thumbnailUrl,
  onViewIncrement
}) => {
  // Normalize video prop
  const currentVideo: Video = video || ({
    id: videoId || '',
    videoUrl: videoUrl || '',
    thumbnailUrl: thumbnailUrl || '',
    title: '',
    slug: '',
    description: '',
    categories: [],
    tags: [],
    duration: '',
    views: 0,
    featured: false,
    trending: false,
    publishedAt: null
  } as Video);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Throttling and seeking architecture refs
  const isSeekingPreviewRef = useRef(false);
  const pendingPreviewSeekRef = useRef<number | null>(null);
  const lastPreviewSeekTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trackedRef = useRef<string | null>(null);

  // State
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Floating preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewPos, setPreviewPos] = useState(0); // Pixel position or percentage
  const [previewClampedLeft, setPreviewClampedLeft] = useState(0);

  // View tracking: POST /api/video/:id/view deduplicated per video ID
  useEffect(() => {
    if (currentVideo.id && trackedRef.current !== currentVideo.id) {
      trackedRef.current = currentVideo.id;
      fetch(`/api/video/${currentVideo.id}/view`, { method: 'POST' })
        .then(() => {
          onViewIncrement?.();
        })
        .catch(() => {
          // Silent failure if request fails
        });
    }
  }, [currentVideo.id, onViewIncrement]);

  // Video switching: Reset playback and preview state when video changes
  useEffect(() => {
    setHasStarted(false);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setShowPreview(false);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }

    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.removeAttribute('src');
      previewVideoRef.current.load();
    }

    isSeekingPreviewRef.current = false;
    pendingPreviewSeekRef.current = null;
    lastPreviewSeekTimeRef.current = 0;
    isDraggingRef.current = false;
  }, [currentVideo.videoUrl, currentVideo.id]);

  // Fullscreen change synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Controls auto-hide timer (2.5 seconds)
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isDraggingRef.current) {
          setShowControls(false);
        }
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  // Time formatting helper: MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  // Lazy playback start
  const handleInitialPlay = () => {
    if (!videoRef.current || !currentVideo.videoUrl) return;

    setHasStarted(true);
    setIsLoading(true);

    const mainVideo = videoRef.current;
    mainVideo.src = currentVideo.videoUrl;
    mainVideo.load();
    mainVideo.play().catch(() => {
      setIsPlaying(false);
      setIsLoading(false);
    });

    if (previewVideoRef.current) {
      const previewVideo = previewVideoRef.current;
      previewVideo.src = currentVideo.videoUrl;
      previewVideo.load();
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!hasStarted) {
      handleInitialPlay();
      return;
    }
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  // Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  // Volume slider change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Update buffered progress
  const updateBuffered = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.buffered.length > 0) {
      const end = video.buffered.end(video.buffered.length - 1);
      setBufferedEnd(end);
    }
  };

  // Throttled preview seek request implementation
  const requestPreviewSeek = useCallback((targetTime: number) => {
    const previewVideo = previewVideoRef.current;
    if (!previewVideo || !previewVideo.duration || !isFinite(previewVideo.duration)) return;

    const clampedTime = Math.max(0, Math.min(targetTime, previewVideo.duration));
    const now = performance.now();

    // If currently seeking, record as pending target
    if (isSeekingPreviewRef.current) {
      pendingPreviewSeekRef.current = clampedTime;
      return;
    }

    // Minimum seek interval approximately 60ms
    const elapsed = now - lastPreviewSeekTimeRef.current;
    if (elapsed < 60) {
      pendingPreviewSeekRef.current = clampedTime;
      return;
    }

    try {
      isSeekingPreviewRef.current = true;
      lastPreviewSeekTimeRef.current = now;
      previewVideo.currentTime = clampedTime;
    } catch {
      isSeekingPreviewRef.current = false;
    }
  }, []);

  const handlePreviewSeeked = useCallback(() => {
    isSeekingPreviewRef.current = false;

    if (pendingPreviewSeekRef.current !== null) {
      const nextTime = pendingPreviewSeekRef.current;
      pendingPreviewSeekRef.current = null;
      requestPreviewSeek(nextTime);
    }
  }, [requestPreviewSeek]);

  // Timeline scrubbing & calculation
  const calculateTimelinePosition = (clientX: number) => {
    if (!timelineRef.current || !containerRef.current || !duration) return null;

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const rawPos = (clientX - timelineRect.left) / timelineRect.width;
    const clampedPos = Math.max(0, Math.min(1, rawPos));
    const targetTime = clampedPos * duration;

    // Calculate clamped left position for the floating preview card
    const pixelInTimeline = clampedPos * timelineRect.width;
    const previewWidth = 160; // Approximate card width
    const halfWidth = previewWidth / 2;

    const timelineLeftOffset = timelineRect.left - containerRect.left;
    const centerPixel = timelineLeftOffset + pixelInTimeline;
    const clampedCenter = Math.max(halfWidth + 8, Math.min(containerRect.width - halfWidth - 8, centerPixel));

    return {
      pos: clampedPos,
      time: targetTime,
      previewLeft: clampedCenter
    };
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasStarted) return;
    const data = calculateTimelinePosition(e.clientX);
    if (!data) return;

    if (previewHideTimeoutRef.current) {
      clearTimeout(previewHideTimeoutRef.current);
    }

    setShowPreview(true);
    setPreviewTime(data.time);
    setPreviewPos(data.pos * 100);
    setPreviewClampedLeft(data.previewLeft);
    requestPreviewSeek(data.time);
  };

  const handleTimelineLeave = () => {
    if (!isDraggingRef.current) {
      setShowPreview(false);
    }
  };

  const handleSeek = (clientX: number) => {
    const data = calculateTimelinePosition(clientX);
    if (!data || !videoRef.current) return;

    videoRef.current.currentTime = data.time;
    setCurrentTime(data.time);
    setPreviewTime(data.time);
    setPreviewPos(data.pos * 100);
    setPreviewClampedLeft(data.previewLeft);
    requestPreviewSeek(data.time);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasStarted) return;
    isDraggingRef.current = true;
    handleSeek(e.clientX);
    setShowPreview(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        handleSeek(moveEvent.clientX);
        resetControlsTimeout();
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setShowPreview(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Mobile Touch scrubbing
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hasStarted) return;
    isDraggingRef.current = true;
    resetControlsTimeout();
    if (previewHideTimeoutRef.current) {
      clearTimeout(previewHideTimeoutRef.current);
    }

    const touch = e.touches[0];
    handleSeek(touch.clientX);
    setShowPreview(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    resetControlsTimeout();
    const touch = e.touches[0];
    handleSeek(touch.clientX);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    // Delayed preview hide behavior for mobile
    previewHideTimeoutRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 1200);
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden select-none group text-white"
    >
      {/* Hidden secondary video element used strictly for independent timeline previews */}
      <video
        ref={previewVideoRef}
        preload="metadata"
        muted
        playsInline
        onSeeked={handlePreviewSeeked}
        className="hidden"
      />

      {/* Main Video Element */}
      <video
        ref={videoRef}
        preload="none"
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);
          }
        }}
        onProgress={updateBuffered}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
        }}
        className="w-full h-full object-contain bg-black cursor-pointer"
      />

      {/* Initial state: Poster / Thumbnail overlay & Centered circular play button */}
      {!hasStarted && (
        <div
          onClick={handleInitialPlay}
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer bg-black/30 backdrop-blur-[1px] transition-opacity duration-300"
        >
          {currentVideo.thumbnailUrl && (
            <img
              src={currentVideo.thumbnailUrl}
              alt={currentVideo.title || 'Video Thumbnail'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Subtle dark overlay */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Centered circular play button */}
          <button
            type="button"
            aria-label="Play video"
            className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-200 cursor-pointer"
          >
            <Play className="w-8 h-8 fill-white ml-1 text-white" />
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {hasStarted && isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
        </div>
      )}

      {/* Floating Timeline Preview Card */}
      {hasStarted && showPreview && duration > 0 && (
        <div
          className="absolute bottom-14 z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center transition-all duration-75"
          style={{ left: `${previewClampedLeft}px` }}
        >
          <div className="w-36 sm:w-44 aspect-video bg-neutral-900 border border-white/20 rounded-lg overflow-hidden shadow-2xl relative">
            <video
              ref={(el) => {
                // Keep the preview canvas synchronized with previewVideoRef frames
                if (el && previewVideoRef.current && el.src !== previewVideoRef.current.src) {
                  el.src = previewVideoRef.current.src;
                }
                if (el && previewVideoRef.current && Math.abs(el.currentTime - previewTime) > 0.3) {
                  try {
                    el.currentTime = previewTime;
                  } catch {}
                }
              }}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Timestamp Badge */}
            <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1.5 py-0.5 rounded font-mono font-medium">
              {formatTime(previewTime)}
            </div>
          </div>
        </div>
      )}

      {/* Compact Controls Overlay */}
      {hasStarted && (
        <div
          className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 pointer-events-auto ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Controls background gradient */}
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-3 px-3 sm:px-4">
            {/* Slim Timeline */}
            <div
              ref={timelineRef}
              onMouseMove={handleTimelineHover}
              onMouseLeave={handleTimelineLeave}
              onMouseDown={handleTimelineMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="group/timeline relative w-full h-1 hover:h-2.5 bg-white/20 rounded-full cursor-pointer transition-all duration-150 mb-3 flex items-center"
            >
              {/* Buffered Bar */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/40 rounded-full pointer-events-none"
                style={{ width: `${Math.min(100, Math.max(0, bufferedPercent))}%` }}
              />

              {/* Red Played Progress Bar */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full pointer-events-none"
                style={{ width: `${Math.min(100, Math.max(0, playedPercent))}%` }}
              >
                {/* Circular Scrubber */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-red-600 rounded-full shadow-md scale-0 group-hover/timeline:scale-100 transition-transform duration-100" />
              </div>
            </div>

            {/* Bottom Bar: Play/Pause, Volume, Time, Fullscreen */}
            <div className="flex items-center justify-between">
              {/* Left Group */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Play / Pause button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-1.5 hover:text-red-500 transition-colors focus:outline-none"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center group/volume space-x-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className="p-1.5 hover:text-red-500 transition-colors focus:outline-none"
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
                    aria-label="Volume slider"
                    className="w-14 sm:w-20 h-1 bg-white/30 accent-red-600 rounded-lg appearance-none cursor-pointer focus:outline-none"
                  />
                </div>

                {/* Current Time / Duration */}
                <div className="text-xs sm:text-sm font-mono text-neutral-300 select-none pl-1">
                  <span>{formatTime(currentTime)}</span>
                  <span className="mx-1 text-neutral-500">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Group: Fullscreen */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  className="p-1.5 hover:text-red-500 transition-colors focus:outline-none"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
