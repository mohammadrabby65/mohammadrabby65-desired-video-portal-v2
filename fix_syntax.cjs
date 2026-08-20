const fs = require('fs');
const file = 'src/components/ui/VideoCard.tsx';

let content = fs.readFileSync(file, 'utf8');

// I will just replace the VideoPreview function entirely with a clean one
const regex = /const VideoPreview = React\.memo\(\(\{\s*videoUrl,\s*onStop\s*\}\s*:\s*\{\s*videoUrl:\s*string,\s*onStop:\s*\(\)\s*=>\s*void\s*\}\)\s*=>\s*\{[\s\S]*?\}\);/m;

const cleanPreview = `const VideoPreview = React.memo(({ videoUrl, onStop }: { videoUrl: string, onStop: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const hlsInstanceRef = React.useRef<Hls | null>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isM3U8 = videoUrl.includes('.m3u8');
    
    const playVideo = async () => {
      try {
        await video.play();
      } catch (err: any) {
        console.error("[VideoPreview] play() failed:", err);
      }
    };

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
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        playVideo();
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
           onStop();
        }
      });
    } else {
      video.src = videoUrl;
      // DO NOT set crossOrigin for MP4 unless absolutely necessary.
      // Since speedyfiles restricts CORS, adding crossOrigin="anonymous" will break it!
      video.removeAttribute('crossOrigin'); 
      playVideo();
    }

    return () => {
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
});`;

content = content.replace(regex, cleanPreview);
fs.writeFileSync(file, content);
console.log("Syntax fixed!");
