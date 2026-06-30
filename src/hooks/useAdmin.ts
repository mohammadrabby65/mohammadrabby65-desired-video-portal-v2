import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getCountFromServer, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, QueryConstraint, DocumentSnapshot } from 'firebase/firestore';
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

export function useCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const q = query(collection(db, 'categories'), orderBy('name', 'asc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    }
  });
}
