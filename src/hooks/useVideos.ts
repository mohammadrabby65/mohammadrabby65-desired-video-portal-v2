import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
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

      const q = query(collection(db, 'posts'), ...constraints);
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useRelatedVideos(videoId: string | undefined, categories: string[] | undefined, tags: string[] | undefined) {
  return useQuery({
    queryKey: ['videos', 'related', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      
      let relatedVideos: VideoPost[] = [];
      
      if (categories && categories.length > 0) {
        const q = query(
          collection(db, 'posts'),
          where('categories', 'array-contains-any', categories.slice(0, 10)),
          orderBy('publishedAt', 'desc'),
          limit(21) // Fetch 21 in case one of them is the current video
        );
        
        const snapshot = await getDocs(q);
        const fetchedVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
        
        // Filter out current video and limit to 20
        relatedVideos = fetchedVideos.filter(v => v.id !== videoId).slice(0, 20);
      }
      
      if (relatedVideos.length < 20) {
        const remaining = 20 - relatedVideos.length;
        // Fetch remaining videos from latest, getting enough to account for duplicates and the current video
        const latestQ = query(
          collection(db, 'posts'),
          orderBy('publishedAt', 'desc'),
          limit(remaining + 20) // Provide a buffer for overlap
        );
        const latestSnapshot = await getDocs(latestQ);
        const latestVideos = latestSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
        
        const existingIds = new Set(relatedVideos.map(v => v.id));
        existingIds.add(videoId);
        
        const additionalVideos = latestVideos.filter(v => !existingIds.has(v.id)).slice(0, remaining);
        relatedVideos = [...relatedVideos, ...additionalVideos];
      }
      
      return relatedVideos;
    },
    enabled: !!videoId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useAdjacentVideos(publishedAt: any, currentSlug: string | undefined) {
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
    enabled: !!publishedAt && !!currentSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
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
      const q = query(collection(db, 'posts'), ...constraints);
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
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
        } else {
          // In a real application, if the cursor is missing (e.g., direct jump to page 10),
          // we cannot fetch page 10 without reading all intervening documents.
          // To strictly adhere to "read only 20 documents", we cannot catch up sequentially.
          // As a fallback to prevent crashing, we just execute without a cursor (fetches page 1),
          // but we log a warning.
          console.warn(`Missing cursor for page ${page}. Firestore does not support arbitrary offsets without charging for skipped reads.`);
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
