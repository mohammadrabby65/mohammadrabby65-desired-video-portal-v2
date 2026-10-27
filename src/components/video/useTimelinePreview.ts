import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

export interface StoryboardData {
  interval: number;
  rows: number;
  cols: number;
  width: number;
  height: number;
}

export interface VttCue {
  startTime: number;
  endTime: number;
  url: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

interface UseTimelinePreviewOptions {
  videoUrl: string;
  duration: number;
  activeTime: number;
  isActive: boolean;
  enabled: boolean;
  previewStoryboardUrl?: string;
  previewStoryboardData?: StoryboardData;
  previewVttUrl?: string;
}

const PREVIEW_WIDTH = 160;
const PREVIEW_HEIGHT = 90;
const MAX_CACHE_ENTRIES = 80;
const SEEK_THROTTLE_MS = 65;

function parseVttTimestamp(ts: string): number {
  const parts = ts.trim().split(":");
  if (parts.length === 3) {
    return (
      parseFloat(parts[0]) * 3600 +
      parseFloat(parts[1]) * 60 +
      parseFloat(parts[2].replace(",", "."))
    );
  }
  if (parts.length === 2) {
    return (
      parseFloat(parts[0]) * 60 + parseFloat(parts[1].replace(",", "."))
    );
  }
  return 0;
}

function parseWebVtt(vttText: string, baseUrl: string): VttCue[] {
  const lines = vttText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim());
  const cues: VttCue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("-->")) {
      const [startStr, endStr] = line.split("-->");
      const startTime = parseVttTimestamp(startStr);
      const endTime = parseVttTimestamp(endStr.split(" ")[0]);
      const payload = lines[i + 1] || "";
      if (payload && !payload.includes("-->")) {
        const [rawUrl, hash] = payload.split("#");
        let resolvedUrl = rawUrl;
        try {
          resolvedUrl = new URL(rawUrl, baseUrl).toString();
        } catch {
          resolvedUrl = rawUrl;
        }
        const cue: VttCue = { startTime, endTime, url: resolvedUrl };
        if (hash && hash.startsWith("xywh=")) {
          const coords = hash
            .slice(5)
            .split(",")
            .map((n) => parseFloat(n));
          if (coords.length === 4 && coords.every((n) => Number.isFinite(n))) {
            cue.x = coords[0];
            cue.y = coords[1];
            cue.w = coords[2];
            cue.h = coords[3];
          }
        }
        cues.push(cue);
        i++;
      }
    }
  }
  return cues;
}

export function useTimelinePreview({
  videoUrl,
  duration,
  activeTime,
  isActive,
  enabled,
  previewStoryboardUrl,
  previewStoryboardData,
  previewVttUrl,
}: UseTimelinePreviewOptions) {
  const [cachedFrameUrl, setCachedFrameUrl] = useState<string | null>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [isSeekingFrame, setIsSeekingFrame] = useState(false);
  const [canvasTainted, setCanvasTainted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [vttCues, setVttCues] = useState<VttCue[]>([]);

  const frameCacheRef = useRef<Map<number, string>>(new Map());
  const secVideoRef = useRef<HTMLVideoElement | null>(null);
  const secHlsRef = useRef<Hls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSeekingRef = useRef(false);
  const pendingBucketRef = useRef<number | null>(null);
  const currentBucketRef = useRef<number | null>(null);
  const lastSeekDispatchRef = useRef<number>(0);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoHostContainerRef = useRef<HTMLDivElement | null>(null);

  const hasStoryboard = Boolean(previewStoryboardUrl && previewStoryboardData);
  const hasVtt = vttCues.length > 0;
  const useSpriteMode = hasStoryboard || hasVtt;

  // Optional WebVTT storyboard loader
  useEffect(() => {
    if (!previewVttUrl) {
      setVttCues([]);
      return;
    }
    let cancelled = false;
    fetch(previewVttUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        if (!cancelled) {
          setVttCues(parseWebVtt(text, previewVttUrl));
        }
      })
      .catch(() => {
        if (!cancelled) setVttCues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [previewVttUrl]);

  // Reset state and cache when videoUrl changes
  useEffect(() => {
    frameCacheRef.current.clear();
    setCachedFrameUrl(null);
    setIsFrameReady(false);
    setIsSeekingFrame(false);
    setCanvasTainted(false);
    setVideoFailed(false);
    isSeekingRef.current = false;
    pendingBucketRef.current = null;
    currentBucketRef.current = null;

    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);

    if (secHlsRef.current) {
      secHlsRef.current.destroy();
      secHlsRef.current = null;
    }
    if (secVideoRef.current) {
      secVideoRef.current.pause();
      secVideoRef.current.removeAttribute("src");
      secVideoRef.current.load();
      secVideoRef.current = null;
    }
  }, [videoUrl]);

  // Lazily initialize the secondary video element only when enabled and not using sprite sheets
  useEffect(() => {
    if (!enabled || !videoUrl || useSpriteMode || videoFailed) return;
    if (secVideoRef.current) return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.display = "block";
    video.style.pointerEvents = "none";

    secVideoRef.current = video;

    // Attach to preview container if already mounted
    if (videoHostContainerRef.current) {
      videoHostContainerRef.current.innerHTML = "";
      videoHostContainerRef.current.appendChild(video);
    }

    const isM3U8 = videoUrl.includes(".m3u8");

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 4,
        maxMaxBufferLength: 8,
        startLevel: 0, // Lowest resolution level for fast thumbnail decoding
      });
      secHlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.levels.length > 0) {
          hls.currentLevel = 0;
        }
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setVideoFailed(true);
        }
      });
    } else {
      video.src = videoUrl;
      video.load();
    }

    const captureFrame = (bucket: number) => {
      if (!canvasTainted) {
        try {
          if (!canvasRef.current) {
            const c = document.createElement("canvas");
            c.width = PREVIEW_WIDTH;
            c.height = PREVIEW_HEIGHT;
            canvasRef.current = c;
          }
          const ctx = canvasRef.current.getContext("2d");
          if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
            const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.72);
            if (dataUrl && dataUrl.startsWith("data:image/")) {
              if (frameCacheRef.current.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = frameCacheRef.current.keys().next().value;
                if (oldestKey !== undefined) {
                  frameCacheRef.current.delete(oldestKey);
                }
              }
              frameCacheRef.current.set(bucket, dataUrl);
              setCachedFrameUrl(dataUrl);
            }
          }
        } catch {
          // Cross-origin stream without CORS headers: canvas is tainted.
          // Fall back seamlessly to displaying the secondary <video> element directly.
          setCanvasTainted(true);
          setCachedFrameUrl(null);
        }
      }
      setIsFrameReady(true);
      setIsSeekingFrame(false);
    };

    const handleSeeked = () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
      const completedBucket = currentBucketRef.current;
      if (completedBucket !== null) {
        captureFrame(completedBucket);
      } else {
        setIsFrameReady(true);
        setIsSeekingFrame(false);
      }

      isSeekingRef.current = false;

      // If another timestamp bucket was queued while seeking, dispatch it next
      if (
        pendingBucketRef.current !== null &&
        pendingBucketRef.current !== completedBucket
      ) {
        const nextBucket = pendingBucketRef.current;
        pendingBucketRef.current = null;
        dispatchSeek(nextBucket);
      }
    };

    const handleError = () => {
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      isSeekingRef.current = false;
      setIsSeekingFrame(false);
      setVideoFailed(true);
    };

    const dispatchSeek = (bucket: number) => {
      if (!secVideoRef.current) return;
      const cached = frameCacheRef.current.get(bucket);
      if (cached) {
        // Refresh LRU order
        frameCacheRef.current.delete(bucket);
        frameCacheRef.current.set(bucket, cached);
        setCachedFrameUrl(cached);
        setIsFrameReady(true);
        setIsSeekingFrame(false);
        return;
      }

      if (isSeekingRef.current) {
        pendingBucketRef.current = bucket;
        return;
      }

      isSeekingRef.current = true;
      currentBucketRef.current = bucket;
      lastSeekDispatchRef.current = performance.now();
      setIsSeekingFrame(true);

      // Safety timeout in case a stream stalls on seek
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false;
        setIsSeekingFrame(false);
        if (secVideoRef.current && secVideoRef.current.readyState >= 2) {
          setIsFrameReady(true);
        }
      }, 650);

      try {
        secVideoRef.current.currentTime = bucket;
      } catch {
        isSeekingRef.current = false;
        setIsSeekingFrame(false);
      }
    };

    (video as any).__dispatchSeek = dispatchSeek;

    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("loadeddata", () => {
      if (currentBucketRef.current !== null && !isSeekingRef.current) {
        captureFrame(currentBucketRef.current);
      }
    });
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
  }, [enabled, videoUrl, useSpriteMode, videoFailed, canvasTainted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      if (secHlsRef.current) {
        secHlsRef.current.destroy();
        secHlsRef.current = null;
      }
      if (secVideoRef.current) {
        secVideoRef.current.pause();
        secVideoRef.current.removeAttribute("src");
        secVideoRef.current = null;
      }
    };
  }, []);

  // Attach the secondary <video> DOM node into the preview card container ref
  const bindVideoContainerRef = useCallback((node: HTMLDivElement | null) => {
    videoHostContainerRef.current = node;
    if (node && secVideoRef.current && secVideoRef.current.parentElement !== node) {
      node.innerHTML = "";
      node.appendChild(secVideoRef.current);
    }
  }, []);

  // Quantize activeTime and trigger frame lookup / seek when hovering or dragging
  useEffect(() => {
    if (!isActive || !Number.isFinite(duration) || duration <= 0 || useSpriteMode || videoFailed) {
      return;
    }

    const step = duration > 300 ? 2 : 1;
    const clampedTime = Math.max(0, Math.min(duration - 0.05, activeTime));
    const bucket = Math.max(0, Math.floor(clampedTime / step) * step);

    // Check in-memory cache first for instant 0ms hit
    const cached = frameCacheRef.current.get(bucket);
    if (cached) {
      setCachedFrameUrl(cached);
      setIsFrameReady(true);
      setIsSeekingFrame(false);
      return;
    }

    const video = secVideoRef.current as any;
    if (!video || typeof video.__dispatchSeek !== "function") return;

    const now = performance.now();
    const elapsed = now - lastSeekDispatchRef.current;

    if (elapsed >= SEEK_THROTTLE_MS) {
      video.__dispatchSeek(bucket);
    } else {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = setTimeout(() => {
        if (secVideoRef.current && (secVideoRef.current as any).__dispatchSeek) {
          (secVideoRef.current as any).__dispatchSeek(bucket);
        }
      }, SEEK_THROTTLE_MS - elapsed);
    }
  }, [activeTime, duration, isActive, useSpriteMode, videoFailed]);

  // Compute sprite / WebVTT style if available
  const getSpriteStyle = useCallback((): React.CSSProperties | null => {
    if (previewStoryboardData && previewStoryboardUrl && duration > 0) {
      const { interval, cols, rows, width, height } = previewStoryboardData;
      const totalFrames = cols * rows;
      let frameIndex = Math.floor(Math.max(0, activeTime) / Math.max(1, interval));
      frameIndex = Math.max(0, Math.min(frameIndex, totalFrames - 1));

      const r = Math.floor(frameIndex / cols);
      const c = frameIndex % cols;

      const scaleX = PREVIEW_WIDTH / width;
      const scaleY = PREVIEW_HEIGHT / height;

      return {
        backgroundImage: `url(${previewStoryboardUrl})`,
        backgroundPosition: `-${c * width * scaleX}px -${r * height * scaleY}px`,
        width: `${PREVIEW_WIDTH}px`,
        height: `${PREVIEW_HEIGHT}px`,
        backgroundSize: `${cols * width * scaleX}px ${rows * height * scaleY}px`,
        backgroundRepeat: "no-repeat",
      };
    }

    if (vttCues.length > 0) {
      const cue =
        vttCues.find((c) => activeTime >= c.startTime && activeTime <= c.endTime) ||
        vttCues[vttCues.length - 1];
      if (cue) {
        if (cue.w && cue.h && cue.x !== undefined && cue.y !== undefined) {
          return {
            backgroundImage: `url(${cue.url})`,
            backgroundPosition: `-${cue.x}px -${cue.y}px`,
            width: `${cue.w}px`,
            height: `${cue.h}px`,
            backgroundRepeat: "no-repeat",
          };
        }
        return {
          backgroundImage: `url(${cue.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          width: `${PREVIEW_WIDTH}px`,
          height: `${PREVIEW_HEIGHT}px`,
        };
      }
    }

    return null;
  }, [previewStoryboardData, previewStoryboardUrl, vttCues, activeTime, duration]);

  return {
    spriteStyle: getSpriteStyle(),
    cachedFrameUrl,
    isFrameReady,
    isSeekingFrame,
    videoFailed,
    useSpriteMode,
    bindVideoContainerRef,
    previewWidth: PREVIEW_WIDTH,
    previewHeight: PREVIEW_HEIGHT,
  };
}
