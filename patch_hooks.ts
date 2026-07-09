import fs from 'fs';

let content = fs.readFileSync('src/hooks/useVideos.ts', 'utf-8');

// Replace useRelatedVideos
content = content.replace(
  /export function useRelatedVideos.*?return useInfiniteQuery\({/s,
  `export function useRelatedVideos(videoId: string | undefined, categories: string[] | undefined, tags: string[] | undefined, limitCount = 4) {
  const queryClient = useQueryClient();
  return useInfiniteQuery({`
);

content = content.replace(
  /    getNextPageParam: \(lastPage\) => lastPage.nextCursor,\n    enabled: false,/s,
  `    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: () => {
      if (!videoId) return undefined;
      const cached = queryClient.getQueriesData({ queryKey: ['videos'] });
      let allVideos: VideoPost[] = [];
      cached.forEach(([_, data]: any) => {
        if (!data) return;
        if (data.pages) data.pages.forEach((page: any) => page.videos && allVideos.push(...page.videos));
        else if (Array.isArray(data)) allVideos.push(...data);
        else if (data.posts) allVideos.push(...data.posts);
      });
      
      let related = allVideos.filter(v => 
        v.id !== videoId && 
        v.categories && categories && v.categories.some(c => categories.includes(c))
      );
      
      related = Array.from(new Map(related.map(v => [v.id, v])).values());
      related.sort((a, b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0));
      
      if (related.length >= limitCount) {
        return {
          pages: [{ videos: related.slice(0, limitCount), nextCursor: null }],
          pageParams: [null]
        };
      }
      return undefined;
    },
    enabled: !!videoId,`
);

// Replace useAdjacentVideos
content = content.replace(
  /export function useAdjacentVideos.*?return useQuery\({/s,
  `export function useAdjacentVideos(publishedAt: any, currentSlug: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({`
);

content = content.replace(
  /    enabled: false,/s,
  `    initialData: () => {
      if (!currentSlug) return undefined;
      const cached = queryClient.getQueriesData({ queryKey: ['videos'] });
      let allVideos: VideoPost[] = [];
      cached.forEach(([_, data]: any) => {
        if (!data) return;
        if (data.pages) data.pages.forEach((page: any) => page.videos && allVideos.push(...page.videos));
        else if (Array.isArray(data)) allVideos.push(...data);
        else if (data.posts) allVideos.push(...data.posts);
      });
      
      if (allVideos.length === 0) return undefined;
      const uniqueVideos = Array.from(new Map(allVideos.map(v => [v.id, v])).values());
      uniqueVideos.sort((a, b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0));
      
      const idx = uniqueVideos.findIndex(v => v.slug === currentSlug);
      if (idx > 0 && idx < uniqueVideos.length - 1) {
        return { prev: uniqueVideos[idx - 1], next: uniqueVideos[idx + 1] };
      }
      return undefined;
    },
    enabled: !!currentSlug,`
);

fs.writeFileSync('src/hooks/useVideos.ts', content);
console.log('Hooks patched');
