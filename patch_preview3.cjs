const fs = require('fs');
let code = fs.readFileSync('src/components/ui/VideoCard.tsx', 'utf8');

const startStr = "const VideoPreview = React.memo(({ videoUrl, onStop }: { videoUrl: string, onStop: () => void }) => {";
const endStr = "});\\ninterface VideoCardProps {";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newVideoPreview = `const VideoPreview = React.memo(({ videoUrl, onStop }: { videoUrl: string, onStop: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const hlsInstanceRef = React.useRef<Hls | null>(null);
  const sceneIndexRef = React.useRef(0);
  const sceneTimeoutRef = React.useRef<any>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    let isM3U8 = videoUrl.includes('.m3u8');
    let isDestroyed = false;

    const cleanupScene = () => {
       if (sceneTimeoutRef.current) {
         clearTimeout(sceneTimeoutRef.current);
         sceneTimeoutRef.current = null;
       }
    };
    
    const playScene = (duration: number) => {
       if (isDestroyed) return;
       if (sceneIndexRef.current >= 3) {
          onStop();
          return;
       }
       
       let startFraction = 0;
       if (sceneIndexRef.current === 0) startFraction = 0.05;
       else if (sceneIndexRef.current === 1) startFraction = 0.45;
       else startFraction = 0.80;
       
       const startTime = duration * startFraction;
       
       let sceneDuration = 2500; // 2.5 seconds per scene
       if (duration < 10) {
          sceneDuration = Math.max(500, (duration / 3) * 1000 - 500);
       }
       
       video.currentTime = startTime;
       video.play().catch(err => {
         console.warn("[VideoPreview] play() rejected:", err.name, err.message);
       });
       
       sceneTimeoutRef.current = setTimeout(() => {
          sceneIndexRef.current++;
          playScene(duration);
       }, sceneDuration);
    };

    const handleDuration = () => {
       if (isDestroyed) return;
       const duration = video.duration;
       if (duration && isFinite(duration) && !sceneTimeoutRef.current) {
           sceneIndexRef.current = 0;
           playScene(duration);
       }
    };

    video.addEventListener('loadedmetadata', handleDuration);
    video.addEventListener('durationchange', handleDuration);

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        debug: false
      });
      hlsInstanceRef.current = hls;
      
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
           onStop();
        }
      });
    } else {
      video.src = videoUrl;
      video.removeAttribute('crossOrigin');
    }

    return () => {
      isDestroyed = true;
      cleanupScene();
      video.removeEventListener('loadedmetadata', handleDuration);
      video.removeEventListener('durationchange', handleDuration);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      } else {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [videoUrl, onStop]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      preload="metadata"
      className={'absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-20 ' + (isLoaded ? 'opacity-100' : 'opacity-0')}
      onLoadedData={() => setIsLoaded(true)}
      onError={onStop}
    />
  );
});\n`;

  code = code.substring(0, startIndex) + newVideoPreview + code.substring(endIndex + 4);
  fs.writeFileSync('src/components/ui/VideoCard.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Could not find start or end index");
}
