import { useQuery } from '@tanstack/react-query';
import { VideoPost } from '../types';

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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export type PaginationFilter = {
  category?: string;
  tag?: string;
  searchQuery?: string;
  sortBy?: 'publishedAt' | 'views' | 'duration' | 'featured' | 'random';
};

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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
