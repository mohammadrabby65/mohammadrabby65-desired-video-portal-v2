import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, List, X, Flame, Clock } from 'lucide-react';
import { usePublicCategories } from '../../hooks/useCategories';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  const { data: rawCategories = [], isLoading } = usePublicCategories(isOpen);
  const categories = [...rawCategories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

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
          <Link to="/" onClick={onClose} className="flex items-center">
            <img 
              src="https://i.ibb.co.com/ZzT2wvV0/Header-Logo-White-Version.png" 
              alt="DesiredHub" 
              className="h-10 w-auto object-contain dark:hidden"
              referrerPolicy="no-referrer"
            />
            <img 
              src="https://i.ibb.co.com/SwNGJTLW/Header-Logo-black-Version.png" 
              alt="DesiredHub" 
              className="h-10 w-auto object-contain hidden dark:block"
              referrerPolicy="no-referrer"
            />
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              location.pathname === '/'
                ? 'bg-primary/10 text-primary'
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
                  location.pathname === `/category/${cat.slug}`
                    ? 'bg-primary/10 text-primary'
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
              location.pathname === '/category/trending'
                ? 'bg-orange-500/10 text-orange-500'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Flame className="w-5 h-5 text-orange-500" />
            Trending
          </Link>

          <Link
            to="/category/latest"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
              location.pathname === '/category/latest'
                ? 'bg-blue-500/10 text-blue-500'
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
