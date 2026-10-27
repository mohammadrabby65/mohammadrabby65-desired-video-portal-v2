import React from "react";

interface TimelinePreviewProps {
  visible: boolean;
  positionRatio: number; // 0 to 1
  formattedTime: string;
  spriteStyle: React.CSSProperties | null;
  cachedFrameUrl: string | null;
  isFrameReady: boolean;
  isSeekingFrame: boolean;
  videoFailed: boolean;
  useSpriteMode: boolean;
  bindVideoContainerRef: (node: HTMLDivElement | null) => void;
  previewWidth?: number;
  previewHeight?: number;
}

export function TimelinePreview({
  visible,
  positionRatio,
  formattedTime,
  spriteStyle,
  cachedFrameUrl,
  isFrameReady,
  isSeekingFrame,
  videoFailed,
  useSpriteMode,
  bindVideoContainerRef,
  previewWidth = 160,
  previewHeight = 90,
}: TimelinePreviewProps) {
  const clampedRatio = Math.max(0, Math.min(1, positionRatio));
  // Keep 160px card + 4px margin safely inside the left and right player boundaries
  const halfCardSpan = videoFailed && !useSpriteMode ? 28 : previewWidth / 2 + 4;

  return (
    <div
      className={`absolute bottom-full mb-3.5 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 select-none transition-all duration-150 ${
        visible
          ? "opacity-100 translate-y-0 visible"
          : "opacity-0 translate-y-1 invisible"
      }`}
      style={{
        left: `clamp(${halfCardSpan}px, ${clampedRatio * 100}%, calc(100% - ${halfCardSpan}px))`,
      }}
      aria-hidden={!visible}
    >
      {/* 16:9 Thumbnail Frame Card (shown when sprite exists or live extraction is active) */}
      {(spriteStyle || !videoFailed) && (
        <div
          className="relative rounded-lg overflow-hidden bg-neutral-950 border border-white/25 shadow-[0_8px_28px_rgba(0,0,0,0.85)] ring-1 ring-black/60"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
          }}
        >
          {spriteStyle ? (
            <div style={spriteStyle} className="w-full h-full" />
          ) : (
            <>
              {/* Live secondary video viewport (kept mounted for instant GPU frame rendering & CORS-restricted hosts) */}
              <div
                ref={bindVideoContainerRef}
                className={`w-full h-full overflow-hidden bg-neutral-950 ${
                  cachedFrameUrl ? "opacity-0" : isFrameReady ? "opacity-100" : "opacity-0"
                } transition-opacity duration-100`}
              />

              {/* Cached canvas dataURL overlay (instant 0ms display when CORS allows canvas capture) */}
              {cachedFrameUrl && (
                <img
                  src={cachedFrameUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
              )}

              {/* Initial decode spinner before first frame is ready */}
              {!isFrameReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/95">
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
                </div>
              )}

              {/* Subtle corner indicator when refining frame during fast scrub */}
              {isFrameReady && isSeekingFrame && !cachedFrameUrl && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary/80 animate-pulse" />
              )}
            </>
          )}

          {/* Subtle bottom vignette inside frame */}
          <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Timestamp Pill */}
      <div
        className={`bg-neutral-950/95 backdrop-blur-md text-white text-[11px] sm:text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md border border-white/15 shadow-lg tracking-wider ${
          spriteStyle || !videoFailed ? "mt-1.5" : ""
        }`}
      >
        {formattedTime}
      </div>
    </div>
  );
}
