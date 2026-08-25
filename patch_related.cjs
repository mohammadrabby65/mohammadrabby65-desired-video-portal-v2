const fs = require('fs');
let content = fs.readFileSync('src/components/video/RelatedVideos.tsx', 'utf8');

if (!content.includes('useLanguage')) {
  content = content.replace(
    'import { VideoCard } from "../ui/VideoCard";',
    'import { VideoCard } from "../ui/VideoCard";\nimport { useLanguage } from "../../contexts/LanguageContext";'
  );
  
  content = content.replace(
    'export function RelatedVideos({ videoId, categories = [], tags = [] }: RelatedVideosProps) {',
    'export function RelatedVideos({ videoId, categories = [], tags = [] }: RelatedVideosProps) {\n  const { t } = useLanguage();'
  );
  
  content = content.replace(
    /const title = "Related Videos";/,
    'const title = t("Related Videos");'
  );
  
  fs.writeFileSync('src/components/video/RelatedVideos.tsx', content);
  console.log('Patched RelatedVideos.tsx');
}
