import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../contexts/LanguageContext';

export function useTranslatedVideo(video: any | undefined) {
  const { language } = useLanguage();
  
  return useQuery({
    queryKey: ['video-translation', video?.slug, language],
    queryFn: async () => {
      if (!video || language === 'en') return video;
      try {
        const res = await fetch(`/translations/${language}/${video.slug}.json`);
        if (res.ok) {
          const translation = await res.json();
          // Merge translation fields (title, description, tags, etc.)
          return { ...video, ...translation };
        }
      } catch (err) {
        console.error("Translation fetch failed", err);
      }
      return video;
    },
    enabled: !!video,
    initialData: video
  });
}
