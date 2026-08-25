const fs = require('fs');

let content = fs.readFileSync('src/components/ui/VideoCard.tsx', 'utf8');

if (!content.includes('useTranslatedVideo')) {
  content = content.replace(
    'import { Link } from "react-router-dom";',
    'import { Link } from "react-router-dom";\nimport { useTranslatedVideo } from "../../hooks/useTranslatedVideo";'
  );

  content = content.replace(
    'export function VideoCard({ video, hideCategory = false, featured = false, compact = false }: VideoCardProps) {',
    'export function VideoCard({ video: baseVideo, hideCategory = false, featured = false, compact = false }: VideoCardProps) {\n  const { data: video = baseVideo } = useTranslatedVideo(baseVideo);'
  );
  
  fs.writeFileSync('src/components/ui/VideoCard.tsx', content);
  console.log('Patched VideoCard.tsx');
} else {
  console.log('Already patched VideoCard.tsx');
}
