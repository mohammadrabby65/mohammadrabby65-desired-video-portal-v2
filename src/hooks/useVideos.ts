import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { VideoPost } from '../types';

export function useFeaturedVideos() {
  return useQuery({
    queryKey: ['videos', 'featured'],
    queryFn: async () => {
      const res = await fetch('/api/videos/featured');
      if (!res.ok) {
        throw new Error('Failed to fetch featured videos');
      }
      return res.json() as Promise<VideoPost[]>;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export type VideoFilter = {
  category?: string;
  trending?: boolean;
  sortBy?: 'publishedAt' | 'views' | 'duration' | 'featured' | 'random';
};

export function useInfiniteVideos(filter: VideoFilter, limitCount = 10) {
  return useInfiniteQuery({
    queryKey: ['videos', filter],
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.trending) params.append('sortBy', 'publishedAt');
      if (filter.sortBy) params.append('sortBy', filter.sortBy);
      params.append('page', String(pageParam));
      params.append('limitCount', String(limitCount));

      const res = await fetch(`/api/videos?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch infinite videos');
      }
      const videos = await res.json() as VideoPost[];
      return { videos, pageParam };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.videos.length < limitCount) return undefined;
      return lastPage.pageParam + 1;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useVideoBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['video', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      const res = await fetch(`/api/videos/by-slug/${slug}`);
      if (!res.ok) {
        throw new Error('Video not found');
      }
      return res.json() as Promise<VideoPost>;
    },
    initialData: () => {
      if (typeof window !== 'undefined' && (window as any).__INITIAL_VIDEO_DATA__) {
        const data = (window as any).__INITIAL_VIDEO_DATA__;
        if (data.slug === slug) {
          return data;
        }
      }
      return undefined;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

let cachedLatestVideosForRelated: VideoPost[] | null = null;
let cachedLatestVideosForRelatedTime = 0;

export function useRelatedVideos(videoId: string | undefined, categories: string[] | undefined, tags: string[] | undefined, limitCount = 4) {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: ['videos', 'related', videoId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!videoId || !categories || categories.length === 0) {
        return { videos: [], nextCursor: null };
      }

      const params = new URLSearchParams({
        videoId,
        categories: categories.join(','),
        tags: tags?.join(',') || '',
        page: String(pageParam),
        limitCount: String(limitCount),
      });

      const res = await fetch(`/api/videos/related?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch related videos');
      }
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
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
          pageParams: [1]
        };
      }
      return undefined;
    },
    enabled: !!videoId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useLatestVideos(limitCount = 10) {
  return useQuery({
    queryKey: ['videos', 'latest', limitCount],
    queryFn: async () => {
      const res = await fetch(`/api/videos?limitCount=${limitCount}`);
      if (!res.ok) {
        throw new Error('Failed to fetch latest videos');
      }
      return res.json() as Promise<VideoPost[]>;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useAdjacentVideos(publishedAt: any, currentSlug: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['videos', 'adjacent', currentSlug],
    queryFn: async () => {
      if (!currentSlug) return { prev: null, next: null };

      const params = new URLSearchParams({
        currentSlug,
        seconds: String(publishedAt?.seconds || ''),
        nanoseconds: String(publishedAt?.nanoseconds || ''),
      });

      const res = await fetch(`/api/videos/adjacent?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch adjacent videos');
      }
      return res.json();
    },
    initialData: () => {
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
    enabled: !!currentSlug,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export type PaginationFilter = {
  category?: string;
  tag?: string;
  searchQuery?: string;
  sortBy?: 'publishedAt' | 'views' | 'duration' | 'featured' | 'random';
};

export function usePaginationCount(filter: PaginationFilter) {
  return useQuery({
    queryKey: ['videos', 'count', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.tag) params.append('tag', filter.tag);
      if (filter.searchQuery) params.append('q', filter.searchQuery);
      
      const res = await fetch(`/api/videos/count?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch count');
      const data = await res.json();
      return data.count;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function usePaginationVideos(filter: PaginationFilter, page: number, limitCount = 20) {
  return useQuery({
    queryKey: ['videos', 'page', filter, page, limitCount],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.tag) params.append('tag', filter.tag);
      if (filter.searchQuery) params.append('q', filter.searchQuery);
      if (filter.sortBy) params.append('sortBy', filter.sortBy);
      params.append('page', page.toString());
      params.append('limitCount', limitCount.toString());
      
      const res = await fetch(`/api/videos?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      return data as VideoPost[];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
