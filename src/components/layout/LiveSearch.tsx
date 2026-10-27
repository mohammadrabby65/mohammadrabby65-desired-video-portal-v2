import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { safeLocalStorage } from "../../lib/storage";
import {
  useSearchSuggestions,
  VideoSuggestion,
  CategorySuggestion,
  KeywordSuggestion,
} from "../../hooks/useSearchSuggestions";
import { SearchSuggestionsList } from "../ui/SearchSuggestionsList";

interface LiveSearchProps {
  isMobileOpen?: boolean;
  onMobileToggle?: (open: boolean) => void;
}

export function LiveSearch({ isMobileOpen = false, onMobileToggle }: LiveSearchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlQuery = location.pathname === "/search" ? searchParams.get("q") || "" : "";

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [isDesktopFocused, setIsDesktopFocused] = useState(false);

  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const desktopContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname === "/search") {
      setQuery(searchParams.get("q") || "");
    }
    setIsDesktopFocused(false);
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (isMobileOpen) {
      const timer = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isMobileOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        desktopContainerRef.current &&
        !desktopContainerRef.current.contains(e.target as Node)
      ) {
        setIsDesktopFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDropdownActive =
    (isDesktopFocused || isMobileOpen) && query.trim().length > 0;

  const { suggestions, isFetching } = useSearchSuggestions(
    debouncedQuery,
    isDropdownActive,
  );

  const saveToRecentSearches = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const existingRaw = safeLocalStorage.getItem("recentSearches");
      const existing: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [
        trimmed,
        ...existing.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 8);
      safeLocalStorage.setItem("recentSearches", JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setIsDesktopFocused(false);
    onMobileToggle?.(false);
    if (trimmed) {
      saveToRecentSearches(trimmed);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/search");
    }
  };

  const handleClear = (isMobile: boolean) => {
    setQuery("");
    setDebouncedQuery("");
    if (isMobile) {
      mobileInputRef.current?.focus();
    } else {
      desktopInputRef.current?.focus();
    }
  };

  const handleSelectVideo = (suggestion: VideoSuggestion) => {
    saveToRecentSearches(suggestion.title);
    setIsDesktopFocused(false);
    onMobileToggle?.(false);
    desktopInputRef.current?.blur();
    mobileInputRef.current?.blur();
    navigate(`/video/${encodeURIComponent(suggestion.slug)}`);
  };

  const handleSelectCategory = (suggestion: CategorySuggestion) => {
    saveToRecentSearches(suggestion.name);
    setIsDesktopFocused(false);
    onMobileToggle?.(false);
    desktopInputRef.current?.blur();
    mobileInputRef.current?.blur();
    navigate(`/category/${encodeURIComponent(suggestion.slug)}`);
  };

  const handleSelectKeyword = (suggestion: KeywordSuggestion) => {
    saveToRecentSearches(suggestion.keyword);
    setQuery(suggestion.keyword);
    setIsDesktopFocused(false);
    onMobileToggle?.(false);
    desktopInputRef.current?.blur();
    mobileInputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(suggestion.keyword)}`);
  };

  return (
    <>
      {/* Desktop Inline Search Bar + Autocomplete Dropdown */}
      <div
        ref={desktopContainerRef}
        className="hidden md:block relative w-64 lg:w-80 xl:w-96"
      >
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Search videos"
          className="flex items-center relative w-full"
        >
          <SearchIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={desktopInputRef}
            type="search"
            value={query}
            onFocus={() => setIsDesktopFocused(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsDesktopFocused(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsDesktopFocused(false);
                desktopInputRef.current?.blur();
              }
            }}
            placeholder="Search videos, categories..."
            aria-label="Search videos"
            autoComplete="off"
            className="w-full h-10 pl-10 pr-9 bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-900 text-sm text-white placeholder:text-neutral-500 rounded-full border border-neutral-800 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleClear(false)}
              aria-label="Clear search query"
              className="absolute right-2.5 p-1 text-neutral-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {isDesktopFocused && query.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[75vh] overflow-y-auto">
            <SearchSuggestionsList
              suggestions={suggestions}
              isFetching={isFetching}
              queryText={query.trim()}
              onSelectVideo={handleSelectVideo}
              onSelectCategory={handleSelectCategory}
              onSelectKeyword={handleSelectKeyword}
              compact
            />
          </div>
        )}
      </div>

      {/* Mobile Search Trigger Button */}
      <button
        type="button"
        onClick={() =>
          onMobileToggle ? onMobileToggle(!isMobileOpen) : navigate("/search")
        }
        className="md:hidden h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        aria-label={isMobileOpen ? "Close search" : "Open search"}
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? (
          <X className="w-4 h-4 text-white" />
        ) : (
          <SearchIcon className="w-4 h-4 text-neutral-300" />
        )}
      </button>

      {/* Mobile Expandable Search Bar Row + Autocomplete Dropdown */}
      {isMobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800 px-3.5 py-2.5 z-50 shadow-xl">
          <form
            onSubmit={handleSubmit}
            role="search"
            aria-label="Mobile search videos"
            className="flex items-center gap-2"
          >
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onMobileToggle?.(false);
                }}
                placeholder="Search videos, tags, categories..."
                aria-label="Search videos"
                autoComplete="off"
                className="w-full h-10 pl-9 pr-8 bg-neutral-900 text-sm text-white placeholder:text-neutral-500 rounded-xl border border-neutral-800 focus:border-primary focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleClear(true)}
                  aria-label="Clear search query"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-10 px-3.5 bg-primary hover:bg-accent text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Search
            </button>
          </form>

          {query.trim().length > 0 && (
            <div className="mt-2.5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden max-h-[65vh] overflow-y-auto">
              <SearchSuggestionsList
                suggestions={suggestions}
                isFetching={isFetching}
                queryText={query.trim()}
                onSelectVideo={handleSelectVideo}
                onSelectCategory={handleSelectCategory}
                onSelectKeyword={handleSelectKeyword}
                compact
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
