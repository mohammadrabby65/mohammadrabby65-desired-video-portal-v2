# Implementation Plan: Video Timeline Hover & Seek Preview Thumbnails

## 1. Current Video Player Architecture
- **Component & Entry Point**: The video player is implemented in `src/components/video/VideoPlayer.tsx` and rendered on the watch page (`src/pages/Video.tsx`).
- **Playback Engine**:
  - Uses a custom HTML5 `<video>` element (`videoRef`) with custom-built React playback controls.
  - Supports adaptive HLS streams (`.m3u8`) via `hls.js` (`Hls.isSupported()`) and direct HTML5 media streams (`.mp4`, `.webm`, native Safari HLS).
  - Does not use third-party iframe embeds; all playback occurs inside the custom `<video>` container.
- **Current Timeline & Preview State**:
  - The timeline (`progressRef`) already tracks pointer interactions (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerLeave`, `onPointerCancel`) with normalized `[0, 1]` state values (`hoverPos`, `dragPos`, `isHovering`, `isDragging`).
  - Currently, `VideoPlayer.tsx` only renders a thumbnail box if `previewStoryboardUrl` and `previewStoryboardData` are populated on the video document. Because existing posts in `data-snapshot.json` and Firestore only have `videoUrl` (direct MP4s hosted on external CDNs such as `file.garden` or `catbox.moe`) and `thumbnailUrl`, hovering or dragging currently displays only a timestamp pill with no frame preview.

---

## 2. Feasibility of Frame Extraction for Current Video Sources
- **Media Source Characteristics**:
  - Production videos use direct `.mp4` URLs (e.g., `https://file.garden/.../*.mp4`) and occasional `.m3u8` HLS streams.
  - There is no DRM encryption on these streams.
- **Cross-Origin (CORS) Considerations**:
  - External file hosts (`file.garden`, `catbox.moe`, etc.) allow streaming and arbitrary byte-range seeking inside a standard `<video>` element when loaded without restrictive CORS mode, or with `crossOrigin="anonymous"` when CORS headers are returned.
  - However, if a host omits `Access-Control-Allow-Origin`, calling `canvas.toDataURL()` or `ctx.drawImage(video)` on a non-CORS `<video>` throws a browser `SecurityError` (tainted canvas), and setting `crossOrigin="anonymous"` unconditionally can block media loading on hosts that lack CORS headers.
- **Technical Solution (Dual-Mode Live Frame Extraction)**:
  1. **Canvas Frame Capture + In-Memory Cache (CORS-enabled sources)**: A dedicated offscreen/secondary preview `<video>` attempts to extract quantized frames onto an offscreen `160x90` `<canvas>` and caches the resulting data URL by quantized timestamp bucket in memory.
  2. **Direct Secondary `<video>` Frame Rendering (CORS-restricted sources)**: If canvas capture is blocked by cross-origin security or `crossOrigin` is not supported by the host, the secondary muted `<video preload="metadata" playsInline>` element itself is rendered directly inside the `160x90` preview card and seeked to the quantized timestamp. Because standard `<video>` rendering does not read pixel data into JS, browsers allow cross-origin MP4 byte-range seeking without CORS errors.
  3. **Sprite Sheet & WebVTT Storyboard Support**: If a video provides `previewStoryboardUrl` + `previewStoryboardData` (or a `.vtt` WebVTT storyboard track), the player prioritizes the lightweight sprite sheet immediately without initializing the secondary video decoder.

---

## 3. Recommended Preview Thumbnail Strategy
Based on your selections, the player will implement a **3-tier priority pipeline** that never fakes timestamp previews using the static poster image:

1. **Tier 1 — Sprite Sheet / WebVTT Storyboard (Zero-Decode Fast Path)**:
   - Uses `previewStoryboardUrl` + `previewStoryboardData` (or parsed WebVTT `#xywh=x,y,w,h` cues if a VTT URL is supplied) to slice the exact sprite frame via CSS `background-image` and `background-position`.
2. **Tier 2 — Live Video Frame Extraction (Default for Existing MP4/HLS Videos)**:
   - Lazily initializes a muted, non-playing secondary `<video>` element only after the user starts playback or interacts with the player container (preventing duplicate bandwidth usage on initial page load).
   - Quantizes target timestamps (1-second intervals for videos under 5 minutes, 2-second intervals for longer videos) so rapid cursor movements reuse cached frames and avoid saturating the media decoder.
   - Extracts frames into an in-memory `Map<number, string>` cache (capped at 80 entries with LRU eviction) when `<canvas>` readback succeeds, or displays the synchronized secondary `<video>` frame directly when cross-origin headers disallow canvas extraction.
3. **Tier 3 — Graceful Timestamp-Only Fallback**:
   - While a seek frame is still decoding on a slow connection or if a stream fails to seek, a subtle dark shimmer placeholder appears inside the `160x90` frame card above the timestamp badge, transitioning smoothly once the frame is ready—or falling back cleanly to the timestamp badge if frame extraction is unsupported.

---

## 4. Exact Files & Components to Create or Update
Only the video player and its directly related timeline preview modules will be touched:

1. **`src/components/video/useTimelinePreview.ts` (New Hook / Helper)**:
   - Encapsulates timestamp quantization, throttled seek dispatching (max 1 active seek at a time, queued latest target time), in-memory frame caching (`Map<number, string>`), CORS-safe fallback detection, and optional WebVTT storyboard parsing.
   - Cleans up secondary `<video>`, `hls.js` instance (if HLS), object URLs, and timers on unmount or `videoUrl` change.
2. **`src/components/video/TimelinePreview.tsx` (New Sub-Component)**:
   - Renders the `160x90px` (16:9) floating preview card positioned above the timeline bar (`bottom-full mb-3.5`).
   - Displays the extracted frame image, direct secondary `<video>` viewport, or sprite slice, along with a crisp bottom timestamp pill (`MM:SS` or `HH:MM:SS`) and subtle loading state while seeking.
   - Computes horizontal boundary clamping (`clamp(84px, pointerPercent%, calc(100% - 84px))`) so the `160px`-wide card never overflows the left or right edges of the player in normal or fullscreen mode.
3. **`src/components/video/VideoPlayer.tsx` (Update)**:
   - Integrates `useTimelinePreview` and `TimelinePreview` into the progress bar section.
   - Upgrades the timeline bar UX with:
     - **YouTube-style Ghost Hover Fill**: A translucent hover bar (`bg-white/35`) extending to `hoverPos * 100%` while hovering or scrubbing.
     - **Expanded Track Height & Touch Hit Area**: Adds an invisible taller hit-target (`-top-3 -bottom-3`) for effortless desktop hover and mobile finger scrubbing while smoothly expanding the visible track height on hover/drag (`h-1.5 sm:h-2` expanding to `h-2.5`).
     - Preserves all existing playback, volume, speed, quality, PiP, fullscreen, view counting, and `localStorage` resume behavior.

---

## 5. How Timestamp-to-Thumbnail Mapping Works
1. **Pointer Position to Normalized Ratio**:
   - On `pointermove` or `pointerdown` over the timeline hit area, calculate:
     $$\text{ratio} = \text{clamp}\left(0, \frac{\text{clientX} - \text{rect.left}}{\text{rect.width}}, 1\right)$$
2. **Exact vs. Quantized Timestamp**:
   - **Displayed Timestamp**: Uses the exact time $\text{exactTime} = \text{ratio} \times \text{duration}$ formatted as `M:SS` (or `H:MM:SS` if $\ge 3600\text{s}$) so the label responds with frame-accurate precision.
   - **Frame Bucket Timestamp**: Quantizes $\text{exactTime}$ to the nearest step $\Delta t = \text{duration} > 300 ? 2 : 1$ second:
     $$\text{bucketTime} = \text{Math.floor}\left(\frac{\text{exactTime}}{\Delta t}\right) \times \Delta t$$
3. **Lookup & Extraction Flow**:
   - **If Sprite/WebVTT exists**: Computes `frameIndex = Math.floor(exactTime / interval)` (or matches cue `[startTime, endTime]`) and maps `row = Math.floor(frameIndex / cols)`, `col = frameIndex % cols` to CSS `backgroundPosition`.
   - **If Live Extraction**:
     - Checks `frameCache.get(bucketTime)`. If hit, renders the cached `160x90` data URL immediately (0ms latency).
     - If miss, requests the secondary `<video>` to seek to `bucketTime`. Once `seeked` fires, draws onto the `160x90` `<canvas>` (if CORS-clean) and stores in `frameCache`, or reveals the secondary `<video>` frame directly.

---

## 6. Performance, Caching, and Mobile Touch Support
- **Zero Impact on Initial Page Load**:
  - The secondary preview `<video>` uses `preload="metadata"` and is only attached after the main video has loaded metadata (`duration > 0`) and the user interacts with the player or begins playback.
- **Seek Queue & Throttling (No Decoder Overload)**:
  - Instead of firing `currentTime = ...` on every `pointermove` pixel, the hook waits for any in-flight `seeking` operation on the secondary video to finish (`seeked` event) before seeking to the latest requested `bucketTime`, throttled at `~80ms`.
- **Bounded Memory Cache**:
  - Cached canvas data URLs (`160x90` JPEG at `0.7` quality, ~3–5 KB each) are stored in an LRU map capped at 80 frames (~300 KB total RAM) and cleared automatically when `videoUrl` changes.
- **Mobile & Touch Support**:
  - Uses unified Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) with `setPointerCapture` and `touch-none` on the timeline container so vertical page scrolling does not interrupt horizontal scrubbing.
  - On touch devices, pressing and dragging along the seek bar keeps the controls visible, locks controls auto-hide timeout while `isDragging` is true, and smoothly tracks the finger with the `160x90` preview card lifted above the thumb so the user's finger does not obscure the thumbnail.

---

## 7. Verification & Testing Plan (Desktop & Mobile)
1. **TypeScript & Build Verification**:
   - Run `lint_applet` (`tsc --noEmit`) and `compile_applet` to confirm zero TypeScript or bundle regressions.
2. **Desktop Hover & Scrubbing Checks**:
   - Hover across the progress bar from `0%` to `100%` on existing MP4 videos: verify the `160x90` frame preview and timestamp appear above the cursor, the ghost hover bar fills smoothly to the cursor, and the preview card clamps cleanly at the far-left (`0:00`) and far-right (`duration`) boundaries.
   - Drag the seek handle across the timeline: verify continuous frame updates and accurate video seek on release.
   - Move cursor off the timeline: verify the preview and ghost bar hide immediately.
3. **Mobile Touch & Fullscreen Checks**:
   - Test touch press-and-drag along the timeline: verify controls stay visible during drag, the preview updates without triggering browser scroll, and releasing commits the seek and hides the preview.
   - Test inside Fullscreen mode (`containerRef.current.requestFullscreen()`): verify the preview renders inside the fullscreen container with accurate bounding-box clamping.
4. **Regression Checks**:
   - Confirm play/pause, volume mute/slider, playback speed, HLS quality selector, Picture-in-Picture, view count reporting, and `localStorage` playback resume all work identically to before.
