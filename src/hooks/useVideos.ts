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

      const constraints: QueryConstraint[] = [
        where('categories', 'array-contains-any', categories.slice(0, 10)),
        orderBy('publishedAt', 'desc'),
        limit(limitCount + 1)
      ];

      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }

      const q = query(collection(db, 'posts'), ...constraints);
      const snapshot = await getDocs(q);

      let fetchedDocs = snapshot.docs;
      let nextCursor: DocumentSnapshot | null = null;

      const filteredDocs = fetchedDocs.filter(doc => doc.id !== videoId);

      if (filteredDocs.length > limitCount) {
        nextCursor = filteredDocs[limitCount - 1];
        filteredDocs.pop();
      } else if (fetchedDocs.length > limitCount) {
        nextCursor = fetchedDocs[fetchedDocs.length - 1];
      }

      const videos = filteredDocs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));

      return { videos, nextCursor };
    },
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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
      if (!publishedAt || !currentSlug) return { prev: null, next: null };

      const prevQ = query(
        collection(db, 'posts'),
        orderBy('publishedAt', 'desc'),
        startAfter(publishedAt),
        limit(1)
      );
      
      // For "next", since we are descending, next means newer, so we reverse order.
      const nextQ = query(
        collection(db, 'posts'),
        orderBy('publishedAt', 'asc'),
        startAfter(publishedAt),
        limit(1)
      );

      const [prevSnap, nextSnap] = await Promise.all([getDocs(prevQ), getDocs(nextQ)]);
      
      const prev = prevSnap.empty ? null : { id: prevSnap.docs[0].id, ...prevSnap.docs[0].data() } as VideoPost;
      const next = nextSnap.empty ? null : { id: nextSnap.docs[0].id, ...nextSnap.docs[0].data() } as VideoPost;
      
      return { prev, next };
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

export function usePaginationCount(filter: PaginationFilter) {
  return useQuery({
    queryKey: ['videos', 'count', filter],
    queryFn: async () => {
      const constraints = buildQueryConstraints(filter);
      const q = query(collection(db, 'posts'), ...constraints, limit(1000));
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

// Global cursor cache to support true cursor pagination
const cursorCache: Record<string, Record<number, DocumentSnapshot>> = {};

export function usePaginationVideos(filter: PaginationFilter, page: number, limitCount = 20) {
  return useQuery({
    queryKey: ['videos', 'page', filter, page, limitCount],
    queryFn: async () => {
      const constraints = buildQueryConstraints(filter);
      const filterKey = JSON.stringify(filter);
      
      if (!cursorCache[filterKey]) {
        cursorCache[filterKey] = {};
      }

      let prevCursor = cursorCache[filterKey][page - 1];

      // Recover cursor from sessionStorage if missing
      if (page > 1 && !prevCursor) {
        const storedId = sessionStorage.getItem(`cursor_${filterKey}_${page - 1}`);
        if (storedId) {
          const snap = await getDoc(doc(db, 'posts', storedId));
          if (snap.exists()) {
            prevCursor = snap;
            cursorCache[filterKey][page - 1] = snap;
          }
        }
      }

      // If we are on page > 1, we must have the cursor from the previous page
      // to do true cursor pagination without over-fetching.
      if (page > 1) {
        if (prevCursor) {
          constraints.push(startAfter(prevCursor));
          const q = query(collection(db, 'posts'), ...constraints, limit(limitCount));
          const snapshot = await getDocs(q);
          
          if (snapshot.docs.length > 0) {
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            cursorCache[filterKey][page] = lastDoc;
            sessionStorage.setItem(`cursor_${filterKey}_${page}`, lastDoc.id);
          }
          
          let videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
          if (filter.sortBy === 'random') {
            videos = videos.sort(() => Math.random() - 0.5);
          }
          return videos;
        } else {
          // If cursor is missing (e.g., user clicked page 3 directly), fetch up to that page
          // This costs reads for skipped pages, but keeps it minimal (not the whole collection)
          const catchUpQ = query(collection(db, 'posts'), ...constraints, limit(page * limitCount));
          const catchUpSnap = await getDocs(catchUpQ);
          
          // Save intermediate cursors to cache
          for (let i = 1; i <= page; i++) {
            const pageEndIndex = Math.min(i * limitCount - 1, catchUpSnap.docs.length - 1);
            if (pageEndIndex >= 0) {
              const doc = catchUpSnap.docs[pageEndIndex];
              cursorCache[filterKey][i] = doc;
              sessionStorage.setItem(`cursor_${filterKey}_${i}`, doc.id);
            }
          }
          
          const skipCount = (page - 1) * limitCount;
          let videos = catchUpSnap.docs.slice(skipCount).map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
          
          if (filter.sortBy === 'random') {
            videos = videos.sort(() => Math.random() - 0.5);
          }
          return videos;
        }
      }
      
      const q = query(collection(db, 'posts'), ...constraints, limit(limitCount));
      const snapshot = await getDocs(q);
      
      // Save the last document as the cursor for the next page
      if (snapshot.docs.length > 0) {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        cursorCache[filterKey][page] = lastDoc;
        sessionStorage.setItem(`cursor_${filterKey}_${page}`, lastDoc.id);
      }
      
      let videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
      
      if (filter.sortBy === 'random') {
        videos = videos.sort(() => Math.random() - 0.5);
      }

      return videos;
    },
    staleTime: 1000 * 60 * 60 * 24, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 30 minutes
  });
}
