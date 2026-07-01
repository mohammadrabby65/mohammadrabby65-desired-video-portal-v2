import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryConstraint, DocumentSnapshot } from 'firebase/firestore';
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
    }
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
    enabled: !!slug
  });
}

export function useRelatedVideos(videoId: string | undefined, categories: string[] | undefined, tags: string[] | undefined) {
  return useQuery({
    queryKey: ['videos', 'related', videoId],
    queryFn: async () => {
      if (!videoId || !categories || categories.length === 0) return [];
      
      const q = query(
        collection(db, 'posts'),
        where('categories', 'array-contains-any', categories.slice(0, 10)),
        orderBy('publishedAt', 'desc'),
        limit(11) // Fetch 11 in case one of them is the current video
      );
      
      const snapshot = await getDocs(q);
      const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
      
      // Filter out current video and limit to 10
      return videos.filter(v => v.id !== videoId).slice(0, 10);
    },
    enabled: !!videoId && !!categories && categories.length > 0
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
    }
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
    enabled: !!publishedAt && !!currentSlug
  });
}
