import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';

export function LiveSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

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

  const toggleSearch = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center h-10">
      <div 
        className={`absolute right-0 flex items-center transition-all duration-300 ease-out origin-right z-10 ${
          isOpen 
            ? 'opacity-100 scale-100 pointer-events-auto' 
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <form 
          onSubmit={handleSubmit} 
          className="flex items-center bg-neutral-900/80 backdrop-blur-xl border border-neutral-700/50 hover:border-neutral-600 focus-within:border-primary/50 focus-within:bg-neutral-900 focus-within:shadow-[0_0_15px_rgba(229,9,20,0.15)] rounded-full pl-4 pr-1.5 py-1.5 w-[240px] sm:w-[320px] md:w-[400px] transition-all duration-300"
        >
          <SearchIcon className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search premium videos..."
            className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-neutral-500 px-3 py-1 text-sm outline-none font-medium"
          />
          <button 
            type="button" 
            onClick={() => {
              if (queryText) {
                setQueryText('');
                inputRef.current?.focus();
              } else {
                setIsOpen(false);
              }
            }}
            className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full transition-colors shrink-0 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      </div>

      <button 
        onClick={toggleSearch}
        className={`p-2.5 rounded-full transition-all duration-300 active:scale-95 group relative ${
          isOpen ? 'opacity-0 scale-75 pointer-events-none absolute right-0' : 'opacity-100 scale-100'
        }`}
        aria-label="Search"
      >
        <div className="absolute inset-0 bg-neutral-800/0 group-hover:bg-neutral-800/80 rounded-full transition-colors" />
        <SearchIcon className="w-5 h-5 text-neutral-400 group-hover:text-white relative z-10 transition-colors" />
      </button>
    </div>
  );
}
