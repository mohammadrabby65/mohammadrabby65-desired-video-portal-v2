import { useQuery } from '@tanstack/react-query';
import { Category } from '../types';

export function usePublicCategories(enabled = true) {
  return useQuery({
    queryKey: ['public-categories-all'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await res.json();
      return data as Category[];
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
