import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface CategoryBarProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

export function CategoryBar({ activeCategory, onSelectCategory }: CategoryBarProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ['public-categories'],
    queryFn: async () => {
      const q = query(
        collection(db, 'categories'),
        where('isActive', '!=', false),
        orderBy('isActive'),
        orderBy('displayOrder', 'asc'),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as { id: string, name: string, slug: string }[];
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  return (
    <div className="sticky top-16 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-900 py-4 mb-8">
      <div className="container mx-auto px-4 flex gap-3 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onSelectCategory('All')}
          className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            activeCategory === 'All'
              ? 'bg-neutral-100 text-neutral-950'
              : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
              activeCategory === cat.slug
                ? 'bg-neutral-100 text-neutral-950'
                : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
