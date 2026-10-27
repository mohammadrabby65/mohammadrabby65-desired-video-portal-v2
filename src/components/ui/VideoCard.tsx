import React, { memo } from "react";
import { Link } from "react-router-dom";
import { VideoPost } from "../../types";
import { formatTimeAgo } from "../../lib/utils";
import { Play } from "lucide-react";
import Hls from "hls.js";
import { useVote } from "../../hooks/useVote";

// Session-level cache of video URLs that failed to load/decode so we never
// repeatedly request broken or forbidden streams while scrolling.
const failedPreviewUrls = new Set<string>();

// Check whether a video URL is a supported direct stream (MP4/WebM/MOV/HLS)
// and not a third-party iframe/embed webpage or a previously failed URL.
export function isPreviewSupportedSource(videoUrl?: string | null): boolean {
  if (!videoUrl || typeof videoUrl !== "string") return false;
  const trimmed = videoUrl.trim();
  if (!trimmed || failedPreviewUrls.has(trimmed)) return false;

  try {
    const parsed = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : "https://desiredhub.com");
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const lowerHost = parsed.hostname.toLowerCase();
    const lowerPath = parsed.pathname.toLowerCase();

    // Exclude third-party embed/iframe player pages that cannot play inside <video>
    if (
      lowerPath.includes("/embed") ||
      lowerPath.includes("/e/") ||
      lowerPath.endsWith(".html") ||
      lowerPath.endsWith(".php") ||
      lowerHost.includes("youtube.com") ||
      lowerHost.includes("youtu.be") ||
      lowerHost.includes("vimeo.com") ||
      lowerHost.includes("dailymotion.com") ||
      lowerHost.includes("streamtape.") ||
      lowerHost.includes("dood.") ||
      lowerHost.includes("mixdrop.")
    ) {
      return false;
    }

    // Check HLS support
    if (lowerPath.includes(".m3u8") || trimmed.toLowerCase().includes(".m3u8")) {
      if (Hls.isSupported()) return true;
      if (typeof document !== "undefined") {
        const testVideo = document.createElement("video");
        return Boolean(
          testVideo.canPlayType("application/vnd.apple.mpegurl") ||
            testVideo.canPlayType("audio/mpegurl")
        );
      }
      return false;
    }

    // Direct video file extensions or known direct-stream storage hosts
    if (
      lowerPath.endsWith(".mp4") ||
      lowerPath.endsWith(".webm") ||
      lowerPath.endsWith(".m4v") ||
      lowerPath.endsWith(".mov") ||
      lowerPath.endsWith(".ogv") ||
      lowerHost.includes("file.garden") ||
      lowerHost.includes("imagekit.io") ||
      lowerHost.includes("videy.co") ||
      lowerHost.includes("masaporn.") ||
      lowerHost.includes("desifiles.") ||
      lowerHost.includes("mmsbee")
    ) {
      return true;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Centralized Single-Preview Coordinator (Mobile Viewport + Desktop Hover)
// Ensures strictly ONE video preview plays across the entire page at any time.
// ============================================================================

interface RegisteredCard {
  instanceId: string;
  element: HTMLElement;
  videoUrl: string;
  isIntersecting: boolean;
  intersectionRatio: number;
  completedCycleInCurrentStay: boolean;
  onStart: () => void;
  onStop: () => void;
}

const registeredCards = new Map<string, RegisteredCard>();
const elementToInstanceId = new WeakMap<Element, string>();

let activeInstanceId: string | null = null;
let activeMode: "hover" | "viewport" | null = null;
let sharedObserver: IntersectionObserver | null = null;
let evaluationTimer: ReturnType<typeof setTimeout> | null = null;
let globalListenersAttached = false;

const MIN_VISIBLE_RATIO = 0.6;
const SCROLL_SETTLE_MS = 140;

function isMobileOrTouchViewport(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024) return true;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }
  return false;
}

function stopActivePreview() {
  if (!activeInstanceId) return;
  const prev = registeredCards.get(activeInstanceId);
  activeInstanceId = null;
  activeMode = null;
  if (prev) {
    prev.onStop();
  }
}

function startPreviewForInstance(instanceId: string, mode: "hover" | "viewport") {
  if (activeInstanceId === instanceId) {
    activeMode = mode;
    return;
  }
  stopActivePreview();
  const next = registeredCards.get(instanceId);
  if (!next || !isPreviewSupportedSource(next.videoUrl)) return;
  activeInstanceId = instanceId;
  activeMode = mode;
  next.onStart();
}

function computeViewportScore(card: RegisteredCard): number {
  if (typeof window === "undefined") return card.intersectionRatio;
  const vh = Math.max(1, window.innerHeight);
  const vw = Math.max(1, window.innerWidth);
  const rect = card.element.getBoundingClientRect();

  // Verify real viewport intersection ratio from current bounding box
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(vh, rect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const liveRatio = rect.height > 0 ? visibleHeight / rect.height : 0;

  if (liveRatio < MIN_VISIBLE_RATIO) {
    return -1;
  }

  // Prefer cards near the upper-middle focal zone of the mobile viewport (~36% from top)
  const cardCenterY = rect.top + rect.height / 2;
  const targetY = vh * 0.36;
  const normalizedDistanceY = Math.abs(cardCenterY - targetY) / vh;

  // Deterministic tie-breaker for 2-column mobile rows (left column slightly favored first)
  const normalizedLeft = Math.max(0, rect.left) / vw;

  return liveRatio * 1.4 - normalizedDistanceY * 0.75 - normalizedLeft * 0.04;
}

function evaluateMobileViewportPreview() {
  if (evaluationTimer) {
    clearTimeout(evaluationTimer);
    evaluationTimer = null;
  }

  if (typeof document !== "undefined" && document.hidden) {
    stopActivePreview();
    return;
  }

  // Do not override an active desktop mouse hover preview
  if (activeMode === "hover" && activeInstanceId) {
    return;
  }

  if (!isMobileOrTouchViewport()) {
    if (activeMode === "viewport") {
      stopActivePreview();
    }
    return;
  }

  const eligible: { card: RegisteredCard; score: number }[] = [];

  registeredCards.forEach((card) => {
    if (!card.isIntersecting || card.intersectionRatio < MIN_VISIBLE_RATIO) return;
    if (!isPreviewSupportedSource(card.videoUrl)) return;
    const score = computeViewportScore(card);
    if (score >= 0) {
      eligible.push({ card, score });
    }
  });

  if (eligible.length === 0) {
    if (activeMode === "viewport") {
      stopActivePreview();
    }
    return;
  }

  // Prefer eligible cards that have not yet finished a full preview cycle in this stay
  const freshEligible = eligible.filter((item) => !item.card.completedCycleInCurrentStay);
  const pool = freshEligible.length > 0 ? freshEligible : eligible;

  // If all visible cards already completed a cycle, reset their flags so they can cycle again
  if (freshEligible.length === 0) {
    eligible.forEach((item) => {
      item.card.completedCycleInCurrentStay = false;
    });
  }

  pool.sort((a, b) => b.score - a.score);
  const bestCandidate = pool[0];

  // Hysteresis: if the currently active viewport card is still in the pool and close in score,
  // keep playing it smoothly instead of switching on minor scroll adjustments.
  if (activeMode === "viewport" && activeInstanceId) {
    const currentInPool = pool.find((item) => item.card.instanceId === activeInstanceId);
    if (currentInPool && bestCandidate.score - currentInPool.score < 0.16) {
      return;
    }
  }

  startPreviewForInstance(bestCandidate.card.instanceId, "viewport");
}

function scheduleViewportEvaluation(delayMs = SCROLL_SETTLE_MS) {
  if (evaluationTimer) {
    clearTimeout(evaluationTimer);
  }
  evaluationTimer = setTimeout(() => {
    evaluationTimer = null;
    evaluateMobileViewportPreview();
  }, delayMs);
}

function ensureSharedObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return null;
  }

  if (!globalListenersAttached) {
    globalListenersAttached = true;

    const handleScrollOrResize = () => {
      if (!isMobileOrTouchViewport()) {
        if (activeMode === "viewport") {
          stopActivePreview();
        }
        return;
      }

      // Immediately stop active viewport preview if it scrolled below 60% visibility
      if (activeMode === "viewport" && activeInstanceId) {
        const activeCard = registeredCards.get(activeInstanceId);
        if (activeCard) {
          const score = computeViewportScore(activeCard);
          if (score < 0) {
            activeCard.intersectionRatio = 0;
            activeCard.isIntersecting = false;
            activeCard.completedCycleInCurrentStay = false;
            stopActivePreview();
          }
        }
      }

      scheduleViewportEvaluation(SCROLL_SETTLE_MS);
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopActivePreview();
      } else {
        scheduleViewportEvaluation(100);
      }
    });
  }

  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        let needsEvaluation = false;

        for (const entry of entries) {
          const instanceId = elementToInstanceId.get(entry.target);
          if (!instanceId) continue;
          const card = registeredCards.get(instanceId);
          if (!card) continue;

          const ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
          const meetsThreshold = entry.isIntersecting && ratio >= MIN_VISIBLE_RATIO;

          card.isIntersecting = entry.isIntersecting;
          card.intersectionRatio = ratio;

          if (!meetsThreshold) {
            card.completedCycleInCurrentStay = false;
            // Immediately stop if this card was the active viewport preview and scrolled out
            if (activeInstanceId === instanceId && activeMode === "viewport") {
              stopActivePreview();
              needsEvaluation = true;
            }
          } else {
            needsEvaluation = true;
          }
        }

        if (needsEvaluation && isMobileOrTouchViewport()) {
          scheduleViewportEvaluation(90);
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1.0],
      }
    );
  }

  return sharedObserver;
}

// ============================================================================
// Reusable Hook for Video Card & Spotlight Preview Coordination
// ============================================================================

export function useCardPreview(videoUrl?: string, enablePreview = false) {
  const instanceId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = React.useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!enablePreview || !el || !videoUrl || !isPreviewSupportedSource(videoUrl)) {
      setIsPreviewing(false);
      return;
    }

    const cardRecord: RegisteredCard = {
      instanceId,
      element: el,
      videoUrl,
      isIntersecting: false,
      intersectionRatio: 0,
      completedCycleInCurrentStay: false,
      onStart: () => setIsPreviewing(true),
      onStop: () => setIsPreviewing(false),
    };

    registeredCards.set(instanceId, cardRecord);
    elementToInstanceId.set(el, instanceId);

    const observer = ensureSharedObserver();
    if (observer) {
      observer.observe(el);
    }

    return () => {
      clearHoverTimer();
      if (observer) {
        observer.unobserve(el);
      }
      elementToInstanceId.delete(el);
      registeredCards.delete(instanceId);
      if (activeInstanceId === instanceId) {
        activeInstanceId = null;
        activeMode = null;
        if (isMobileOrTouchViewport()) {
          scheduleViewportEvaluation(60);
        }
      }
    };
  }, [instanceId, videoUrl, enablePreview, clearHoverTimer]);

  const handlePointerEnter = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enablePreview || !videoUrl || !isPreviewSupportedSource(videoUrl)) return;
      // Only trigger hover preview for desktop mouse pointers
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (isMobileOrTouchViewport() && e.pointerType !== "mouse") return;

      clearHoverTimer();
      hoverTimerRef.current = setTimeout(() => {
        hoverTimerRef.current = null;
        startPreviewForInstance(instanceId, "hover");
      }, 200);
    },
    [enablePreview, videoUrl, instanceId, clearHoverTimer]
  );

  const handlePointerLeave = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      clearHoverTimer();
      if (activeInstanceId === instanceId && activeMode === "hover") {
        stopActivePreview();
        if (isMobileOrTouchViewport()) {
          scheduleViewportEvaluation(80);
        }
      }
    },
    [instanceId, clearHoverTimer]
  );

  const handleStopPreview = React.useCallback(
    (markFailed = false) => {
      clearHoverTimer();
      if (markFailed && videoUrl) {
        failedPreviewUrls.add(videoUrl.trim());
      }
      if (activeInstanceId === instanceId) {
        stopActivePreview();
      } else {
        setIsPreviewing(false);
      }
      if (isMobileOrTouchViewport()) {
        scheduleViewportEvaluation(80);
      }
    },
    [instanceId, videoUrl, clearHoverTimer]
  );

  const handleCycleComplete = React.useCallback(() => {
    const card = registeredCards.get(instanceId);
    if (card) {
      card.completedCycleInCurrentStay = true;
    }
    if (activeInstanceId === instanceId && activeMode === "viewport") {
      stopActivePreview();
      scheduleViewportEvaluation(100);
    }
  }, [instanceId]);

  return {
    containerRef,
    isPreviewing,
    handlePointerEnter,
    handlePointerLeave,
    handleStopPreview,
    handleCycleComplete,
  };
}

// ============================================================================
// Muted Inline VideoPreview Component
// ============================================================================

export const VideoPreview = React.memo(function VideoPreview({
  videoUrl,
  onStop,
  onCycleComplete,
}: {
  videoUrl: string;
  onStop: (markFailed?: boolean) => void;
  onCycleComplete?: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const hlsInstanceRef = React.useRef<Hls | null>(null);
  const sceneIndexRef = React.useRef(0);
  const loopCountRef = React.useRef(0);
  const sceneTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPreviewSupportedSource(videoUrl)) {
      onStop(false);
      return;
    }

    let isDestroyed = false;
    const isM3U8 = videoUrl.toLowerCase().includes(".m3u8");

    // Enforce muted inline playback attributes before attaching source or calling play()
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "true");

    const cleanupScene = () => {
      if (sceneTimeoutRef.current) {
        clearTimeout(sceneTimeoutRef.current);
        sceneTimeoutRef.current = null;
      }
    };

    const safePlay = () => {
      if (isDestroyed) return;
      video.muted = true;
      video.volume = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: any) => {
          if (isDestroyed) return;
          // Ignore AbortError caused by rapid scene seeking
          if (err && err.name === "AbortError") return;
          // If autoplay is blocked (NotAllowedError) or source rejected, fall back to static thumbnail
          onStop(err?.name !== "NotAllowedError");
        });
      }
    };

    const playScene = (duration: number) => {
      if (isDestroyed) return;

      if (sceneIndexRef.current >= 3) {
        loopCountRef.current += 1;
        // On mobile viewport mode, let the coordinator advance after 1 full 3-scene cycle (~7.5s)
        // if another card is waiting, or stop after 2 full cycles to preserve battery.
        if (onCycleComplete && isMobileOrTouchViewport()) {
          onCycleComplete();
          return;
        }
        if (loopCountRef.current >= 2) {
          onStop(false);
          return;
        }
        sceneIndexRef.current = 0;
      }

      let startFraction = 0.05;
      if (sceneIndexRef.current === 1) startFraction = 0.45;
      else if (sceneIndexRef.current === 2) startFraction = 0.8;

      const sceneDuration =
        duration < 10
          ? Math.max(1200, (duration / 3) * 1000)
          : 2500;

      try {
        if (Number.isFinite(duration) && duration > 3) {
          video.currentTime = Math.min(duration - 0.5, duration * startFraction);
        }
      } catch {
        // Ignore seek errors before buffer is ready
      }

      safePlay();

      sceneTimeoutRef.current = setTimeout(() => {
        sceneIndexRef.current += 1;
        playScene(duration);
      }, sceneDuration);
    };

    const handleStartPlayback = () => {
      if (isDestroyed || sceneTimeoutRef.current) return;
      const duration = video.duration;
      if (duration && Number.isFinite(duration) && duration > 0) {
        sceneIndexRef.current = 0;
        loopCountRef.current = 0;
        playScene(duration);
      } else {
        // Fallback for streams that don't report duration immediately
        safePlay();
        sceneTimeoutRef.current = setTimeout(() => {
          if (!isDestroyed) onStop(false);
        }, 7500);
      }
    };

    const handleVolumeChange = () => {
      if (!video.muted || video.volume !== 0) {
        video.muted = true;
        video.volume = 0;
      }
    };

    video.addEventListener("loadedmetadata", handleStartPlayback);
    video.addEventListener("durationchange", handleStartPlayback);
    video.addEventListener("volumechange", handleVolumeChange);

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: 0,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        maxBufferLength: 6,
        maxMaxBufferLength: 12,
        debug: false,
      });
      hlsInstanceRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && !isDestroyed) {
          onStop(true);
        }
      });
    } else {
      video.removeAttribute("crossOrigin");
      video.src = videoUrl;
      video.load();
    }

    return () => {
      isDestroyed = true;
      cleanupScene();
      video.removeEventListener("loadedmetadata", handleStartPlayback);
      video.removeEventListener("durationchange", handleStartPlayback);
      video.removeEventListener("volumechange", handleVolumeChange);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      } else {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [videoUrl, onStop, onCycleComplete]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      preload="metadata"
      tabIndex={-1}
      aria-hidden="true"
      className={
        "absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 z-20 " +
        (isLoaded ? "opacity-100" : "opacity-0")
      }
      onLoadedData={() => setIsLoaded(true)}
      onPlaying={() => setIsLoaded(true)}
      onError={() => onStop(true)}
    />
  );
});

interface VideoCardProps {
  video: VideoPost;
  key?: string | number;
  priority?: boolean;
  enablePreview?: boolean;
}

export const VideoCard = memo(function VideoCard({
  video,
  priority = false,
  enablePreview = false,
}: VideoCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const { likePercentage } = useVote(video);

  const {
    containerRef,
    isPreviewing,
    handlePointerEnter,
    handlePointerLeave,
    handleStopPreview,
    handleCycleComplete,
  } = useCardPreview(video.videoUrl, enablePreview);

  React.useEffect(() => {
    setImgError(false);
  }, [video.thumbnailUrl]);

  return (
    <Link
      to={"/video/" + video.slug}
      className="group flex flex-col gap-1 sm:gap-2.5 min-w-0 focus:outline-none"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={() => enablePreview && handleStopPreview(false)}
    >
      <div
        ref={containerRef}
        className="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.08] isolate group-hover:border-white/20 group-focus-visible:ring-2 group-focus-visible:ring-primary transition-all duration-200"
      >
        {isPreviewing && video.videoUrl && (
          <VideoPreview
            videoUrl={video.videoUrl}
            onStop={handleStopPreview}
            onCycleComplete={handleCycleComplete}
          />
        )}

        {!imgError && video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading={priority ? "eager" : "lazy"}
            {...(priority ? { fetchPriority: "high" as any } : {})}
            decoding="async"
            width="600"
            height="338"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center rounded-lg sm:rounded-xl group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-neutral-500 gap-1.5 p-2 sm:p-3 text-center">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
              <Play className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-400 fill-neutral-400 translate-x-0.5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 line-clamp-1 max-w-full px-1.5 sm:px-2">
              {video.title}
            </span>
          </div>
        )}

        {/* Subtle bottom vignette for badge legibility */}
        <div className="absolute inset-x-0 bottom-0 h-9 sm:h-12 bg-gradient-to-t from-black/65 to-transparent pointer-events-none z-10" />

        {/* Play Button Overlay (Desktop hover only, hidden on mobile touch) */}
        <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 sm:group-hover:opacity-100 z-30 transition-opacity duration-200 pointer-events-none">
          <div className="bg-black/65 backdrop-blur-md rounded-full p-3 border border-white/15 shadow-lg transform scale-95 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        {video.duration && (
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 z-30 bg-black/85 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9.5px] sm:text-[11px] font-semibold text-white tracking-wide tabular-nums border border-white/[0.08]">
            {video.duration}
          </div>
        )}

        {/* Top Badges Area */}
        {video.badges && video.badges.length > 0 && (
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-wrap gap-1 sm:gap-1.5 max-w-[calc(100%-44px)] z-30">
            {Array.from(new Set(video.badges)).map((badge) => (
              <div
                key={badge}
                className="bg-primary px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-white tracking-wider uppercase shadow-sm"
              >
                {badge}
              </div>
            ))}
          </div>
        )}
        {/* Quality Badge */}
        {video.quality && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-30 bg-black/75 backdrop-blur-md border border-white/15 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-white tracking-wider uppercase">
            {video.quality}
          </div>
        )}
      </div>

      {/* Typography & Metadata */}
      <div className="flex flex-col px-0.5 min-w-0 w-full gap-0.5 sm:gap-1">
        <h3
          title={video.title}
          className="text-[12.5px] sm:text-[15px] font-semibold text-neutral-100 line-clamp-2 leading-[1.28] sm:leading-[1.35] group-hover:text-primary break-words transition-colors"
        >
          {video.title}
        </h3>
        <div className="flex flex-wrap items-center text-[10.5px] sm:text-xs text-neutral-400 font-medium gap-x-1 sm:gap-x-1.5 gap-y-0.5 tabular-nums">
          <span>{formatTimeAgo(video.publishedAt)}</span>
          {video.views !== undefined && (
            <>
              <span className="text-neutral-600" aria-hidden="true">·</span>
              <span>{video.views.toLocaleString()} views</span>
            </>
          )}
          {likePercentage !== null && (
            <>
              <span className="text-neutral-600" aria-hidden="true">·</span>
              <span className="text-neutral-300">{likePercentage}%</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
});
