import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryConstraint, DocumentSnapshot, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VideoPost } from '../types';

export function useFeaturedVideos() {
  return useQuery({
    queryKey: ['videos', 'featured'],
    queryFn: async () => {
      const q = query(
        collection(db, 'posts'),
        where('featured', '==', true),
        orderBy('publishedAt', 'desc'),
        limit(3)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
    },
    staleTime: 1000 * 60 * 60 * 24, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 30 minutes
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
    queryFn: async ({ pageParam = null }: { pageParam: DocumentSnapshot | null }) => {
      const constraints: QueryConstraint[] = [];

      if (filter.category && filter.category !== 'All') {
        if (filter.category === 'Trending') {
          constraints.push(where('trending', '==', true));
          constraints.push(orderBy('publishedAt', 'desc'));
        } else if (filter.category === 'Latest') {
          constraints.push(orderBy('publishedAt', 'desc'));
        } else if (filter.category === 'Popular') {
          constraints.push(orderBy('views', 'desc'));
        } else {
          constraints.push(where('categories', 'array-contains', filter.category));
          // For category filtering, order by publishedAt desc unless we have a specific sortBy
          if (filter.sortBy && filter.sortBy !== 'random') {
             constraints.push(orderBy(filter.sortBy, 'desc'));
          } else {
             constraints.push(orderBy('publishedAt', 'desc'));
          }
        }
      } else {
        if (filter.trending) {
          constraints.push(where('trending', '==', true));
        }
        if (filter.sortBy && filter.sortBy !== 'random') {
          constraints.push(orderBy(filter.sortBy, 'desc'));
        } else if (!filter.sortBy) {
          constraints.push(orderBy('publishedAt', 'desc'));
        }
      }

      constraints.push(limit(limitCount));

      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }

      const q = query(collection(db, 'posts'), ...constraints, limit(1000));
      const snapshot = await getDocs(q);

      let videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      // Client-side shuffle for "random" sort
      if (filter.sortBy === 'random') {
        videos = videos.sort(() => Math.random() - 0.5);
      }

      return { videos, lastDoc };
    },
    getNextPageParam: (lastPage) => lastPage.lastDoc,
    initialPageParam: null as DocumentSnapshot | null,
    staleTime: 1000 * 60 * 60 * 24, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 30 minutes
  });
}

export function useVideoBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['video', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      const q = query(collection(db, 'posts'), where('slug', '==', slug), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) throw new Error('Video not found');
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as VideoPost;
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
    staleTime: 1000 * 60 * 60 * 24, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 30 minutes
  });
}

let cachedLatestVideosForRelated: VideoPost[] | null = null;
let cachedLatestVideosForRelatedTime = 0;

export function useRelatedVideos(videoId: string | undefined, categories: string[] | undefined, tags: string[] | undefined, limitCount = 4) {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: ['videos', 'related', videoId],
    queryFn: async ({ pageParam = null }) => {
      if (!videoId || !categories || categories.length === 0) {
        return { videos: [], nextCursor: null };
      }

      const params = new URLSearchParams({
        videoId,
        categories: categories.join(','),
        tags: tags?.join(',') || '',
        limitCount: String(limitCount),
      });
      
      if (pageParam) {
        params.append('lastId', pageParam as string);
      }

      const res = await fetch(`/api/videos/related?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch related videos');
      }
      return res.json();
    },
    initialPageParam: null as string | null,
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
    queryKey: ['videos', 'latest'],
    queryFn: async () => {
      const q = query(
        collection(db, 'posts'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
    },
    staleTime: 1000 * 60 * 60 * 24, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 30 minutes
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
    staleTime: 1000 * 60 * 60 * 24, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 30 minutes
  });
}

export type PaginationFilter = {
  category?: string;
  tag?: string;
  searchQuery?: string;
  sortBy?: 'publishedAt' | 'views' | 'duration' | 'featured' | 'random';
};

export function buildQueryConstraints(filter: PaginationFilter) {
  const constraints: QueryConstraint[] = [];

  if (filter.searchQuery) {
    const q = filter.searchQuery.trim().toLowerCase();
    const searchWord = q.split(' ')[0];
    if (searchWord) {
      constraints.push(where('searchTerms', 'array-contains', searchWord));
    }
  } else if (filter.category && filter.category !== 'All') {
    constraints.push(where('categories', 'array-contains', filter.category));
    if (filter.sortBy && filter.sortBy !== 'random') {
       constraints.push(orderBy(filter.sortBy, 'desc'));
    } else {
       constraints.push(orderBy('publishedAt', 'desc'));
    }
  } else if (filter.tag) {
    constraints.push(where('tags', 'array-contains', filter.tag));
    if (filter.sortBy && filter.sortBy !== 'random') {
       constraints.push(orderBy(filter.sortBy, 'desc'));
    } else {
       constraints.push(orderBy('publishedAt', 'desc'));
    }
  } else {
    if (filter.sortBy && filter.sortBy !== 'random') {
      constraints.push(orderBy(filter.sortBy, 'desc'));
    } else if (!filter.sortBy) {
      constraints.push(orderBy('publishedAt', 'desc'));
    }
  }

  return constraints;
}

export function usePaginationVideos(filter: PaginationFilter, limitCount = 20) {
  return useInfiniteQuery({
    queryKey: ['videos', 'infinite', filter, limitCount],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.tag) params.append('tag', filter.tag);
      if (filter.searchQuery) params.append('q', filter.searchQuery);
      if (filter.sortBy) params.append('sortBy', filter.sortBy);
      params.append('limitCount', limitCount.toString());
      if (pageParam) {
        params.append('lastId', pageParam);
      }
      
      const res = await fetch(`/api/videos?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      return data as VideoPost[];
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === limitCount) {
        return lastPage[lastPage.length - 1].id;
      }
      return undefined;
    },
    initialPageParam: null as string | null,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
