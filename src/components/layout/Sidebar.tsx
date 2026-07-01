import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Home, List, X, Flame, Clock } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['public-categories'],
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
      })) as { id: string; name: string; slug: string; isActive?: boolean; displayOrder?: number }[];
      
      cats = cats.filter(c => c.isActive !== false).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      return cats;
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-64 bg-neutral-950 border-r border-neutral-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
      >
        <div className="p-4 flex items-center justify-between border-b border-neutral-800">
          <Link to="/" onClick={onClose} className="text-xl font-bold tracking-tight text-red-500 uppercase">
            Desire
          </Link>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <nav className="p-4 flex flex-col gap-1">
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              location.pathname === '/'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Home className="w-5 h-5" />
            Home
          </Link>

          <div className="mt-6 mb-2 px-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Categories
            </div>
            <Link to="/categories" onClick={onClose} className="hover:text-white transition-colors">View All</Link>
          </div>

          {isLoading ? (
            <div className="px-3 py-2 text-sm text-neutral-500">Loading...</div>
          ) : (
            categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === `/category/${cat.slug}`
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                {cat.name}
              </Link>
            ))
          )}

          <div className="mt-6 mb-2 px-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Other
          </div>

          <Link
            to="/category/trending"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/category/trending'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Flame className="w-5 h-5 text-orange-500" />
            Trending
          </Link>

          <Link
            to="/category/latest"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/category/latest'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Clock className="w-5 h-5 text-blue-500" />
            New
          </Link>
        </nav>
      </div>
    </>
  );
}
