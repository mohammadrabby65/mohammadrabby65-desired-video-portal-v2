const fs = require('fs');
let code = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');

if (!code.includes('videoId?: string')) {
  code = code.replace(
    'interface VideoPlayerProps {',
    'interface VideoPlayerProps {\n  videoId?: string;'
  );
  code = code.replace(
    'export function VideoPlayer({ videoUrl, thumbnailUrl }: VideoPlayerProps) {',
    'export function VideoPlayer({ videoUrl, thumbnailUrl, videoId }: VideoPlayerProps) {'
  );
}

const refsToAdd = `
  const accumulatedPlayTime = useRef(0);
  const lastTimeRef = useRef(0);
  const viewReported = useRef(false);

  useEffect(() => {
    accumulatedPlayTime.current = 0;
    lastTimeRef.current = 0;
    viewReported.current = false;
  }, [videoId]);
`;
if (!code.includes('accumulatedPlayTime')) {
  code = code.replace(
    'const progressRef = useRef<HTMLDivElement>(null);',
    'const progressRef = useRef<HTMLDivElement>(null);' + refsToAdd
  );
}

const timeUpdateReplacement = `
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      setDuration(videoRef.current.duration);

      if (videoId && !viewReported.current && !videoRef.current.paused) {
        const diff = current - lastTimeRef.current;
        if (diff > 0 && diff < 1.0) {
          accumulatedPlayTime.current += diff;
        }
        if (accumulatedPlayTime.current >= 4) {
          viewReported.current = true;
          
          const storageKey = \`viewed_\${videoId}\`;
          const lastViewedStr = localStorage.getItem(storageKey);
          const now = Date.now();
          let shouldReport = true;
          if (lastViewedStr) {
             const lastViewed = parseInt(lastViewedStr, 10);
             if (!isNaN(lastViewed) && (now - lastViewed < 24 * 60 * 60 * 1000)) {
                 shouldReport = false;
             }
          }
          
          if (shouldReport) {
             fetch(\`/api/video/\${videoId}/view\`, { method: "POST" })
               .then(res => {
                   if (res.ok) {
                       localStorage.setItem(storageKey, now.toString());
                   }
               })
               .catch(err => console.error("View reporting failed", err));
          }
        }
      }
      lastTimeRef.current = current;
    }
  };
`;

code = code.replace(
  /const handleTimeUpdate = \(\) => {[\s\S]*?};\n/,
  timeUpdateReplacement
);

fs.writeFileSync('src/components/video/VideoPlayer.tsx', code);
