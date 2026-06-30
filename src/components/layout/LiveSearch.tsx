import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VideoPost } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';

export function LiveSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const debouncedQuery = useDebounce(queryText, 500);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return [];
      
      const q = query(collection(db, 'posts'), orderBy('publishedAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      const allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));
      
      const lowerQ = debouncedQuery.toLowerCase();
      const filtered = allPosts.filter(p => 
        p.title.toLowerCase().includes(lowerQ) || 
        p.tags?.some(t => t.toLowerCase().includes(lowerQ)) ||
        p.category?.toLowerCase().includes(lowerQ)
      );
      
      return filtered.slice(0, 5);
    },
    enabled: debouncedQuery.trim().length >= 2
  });

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      {isOpen ? (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center bg-neutral-900 border border-neutral-800 rounded-full pr-2 overflow-hidden shadow-lg w-[280px] sm:w-[350px]">
          <input
            autoFocus
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search videos..."
            className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-2 text-sm"
          />
          <div className="px-2 text-neutral-500">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
        >
          <SearchIcon className="w-5 h-5" />
        </button>
      )}

      {/* Results Dropdown */}
      {isOpen && queryText.trim() && (
        <div className="absolute top-12 right-0 w-[280px] sm:w-[350px] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50">
          {results && results.length > 0 ? (
            <div className="py-2">
              {results.map(video => (
                <Link
                  key={video.id}
                  to={`/video/${video.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-800 transition-colors"
                >
                  <img src={video.thumbnailUrl} alt={video.title} loading="lazy" className="w-16 h-10 object-cover rounded bg-neutral-950" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{video.title}</p>
                    <p className="text-xs text-neutral-500">{video.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !isLoading && debouncedQuery && (
              <div className="p-4 text-center text-sm text-neutral-500">
                No results found for "{debouncedQuery}"
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
