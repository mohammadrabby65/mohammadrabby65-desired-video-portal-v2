import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';

export function LiveSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryText.trim()) {
      navigate(`/search?q=${encodeURIComponent(queryText.trim())}`);
      setIsOpen(false);
      setQueryText('');
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      {isOpen ? (
        <form onSubmit={handleSubmit} className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center bg-neutral-900 border border-neutral-800 rounded-full pr-2 overflow-hidden shadow-lg w-[280px] sm:w-[350px]">
          <input
            autoFocus
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search videos..."
            className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-2 text-sm outline-none"
          />
          <button type="submit" className="px-2 text-neutral-500 hover:text-white transition-colors">
            <SearchIcon className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
        >
          <SearchIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
