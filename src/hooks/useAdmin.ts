import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getCountFromServer, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, QueryConstraint, DocumentSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VideoPost, Category } from '../types';

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const postsSnap = await getCountFromServer(collection(db, 'posts'));
      const catsSnap = await getCountFromServer(collection(db, 'categories'));
      return {
        totalPosts: postsSnap.data().count,
        totalCategories: catsSnap.data().count,
        totalViews: 'N/A', // Firestore count doesn't easily support summing fields without aggregation queries (which may not be available)
      }
    },
    enabled
  });
}

export function useAdminPosts(limitCount = 10, pageParam: DocumentSnapshot | null = null) {
  return useQuery({
    queryKey: ['admin', 'posts', limitCount, pageParam?.id],
    queryFn: async () => {
      const constraints: QueryConstraint[] = [orderBy('publishedAt', 'desc'), limit(limitCount)];
      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }
      const q = query(collection(db, 'posts'), ...constraints);
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
      return { 
        posts, 
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null 
      };
    },
    staleTime: 1000 * 60 // 1 min
  });
}

export function useCategories(limitCount = 20, pageParam: DocumentSnapshot | null = null) {
  return useQuery({
    queryKey: ['admin', 'categories', limitCount, pageParam?.id],
    queryFn: async () => {
      const constraints: QueryConstraint[] = [orderBy('name', 'asc'), limit(limitCount)];
      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }
      const q = query(collection(db, 'categories'), ...constraints);
      const snapshot = await getDocs(q);
      
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category & { totalVideos?: number }));
      
      for (const cat of cats) {
        try {
          const countQ = query(collection(db, 'posts'), where('category', '==', cat.slug));
          const countSnap = await getCountFromServer(countQ);
          cat.totalVideos = countSnap.data().count;
        } catch (e) {
          cat.totalVideos = 0;
        }
      }

      return {
        categories: cats,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
      };
    },
    staleTime: 1000 * 60 * 5 // 5 min
  });
}
