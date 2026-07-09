import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types';

export function usePublicCategories(enabled = true) {
  return useQuery({
    queryKey: ['public-categories-all'],
    queryFn: async () => {
      const q = query(
        collection(db, 'categories'),
        orderBy('name', 'asc'),
        limit(100)
      );
      const snap = await getDocs(q);
      let cats = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      
      return cats.filter(c => c.isActive !== false);
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
