import { Fragment } from 'react';
import { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Clock, TrendingUp, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usePaginationVideos, PaginationFilter } from '../hooks/useVideos';
import { usePublicCategories } from '../hooks/useCategories';
import { VideoCard } from '../components/ui/VideoCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { SEO } from '../components/seo/SEO';
import { Pagination } from '../components/ui/Pagination';

export function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTextUrl = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  const [queryText, setQueryText] = useState(queryTextUrl);
  const [debouncedQuery, setDebouncedQuery] = useState(queryTextUrl);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(!queryTextUrl);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state with URL when using browser back/forward
  useEffect(() => {
    setQueryText(queryTextUrl);
    if (!queryTextUrl) {
      setIsFocused(true);
    } else {
      setIsFocused(false);
    }
  }, [queryTextUrl]);

  // Focus input on mount if no query
  useEffect(() => {
    if (!queryTextUrl) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {
      // ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    try {
      const updated = [term.trim(), ...recentSearches.filter(t => t.toLowerCase() !== term.trim().toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = (e: React.MouseEvent, termToRemove: string) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter(t => t !== termToRemove);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(queryText.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [queryText]);

  const showSuggestionsOverlay = isFocused || !queryTextUrl;

  const { data: popularCategories = [] } = usePublicCategories(showSuggestionsOverlay);

  const { data: suggestions = [], isFetching: isFetchingSuggestions } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const res = await fetch(`/api/videos?q=${encodeURIComponent(debouncedQuery)}&limitCount=20`);
      if (!res.ok) return [];
      const data = await res.json();
      
      const queryWords = debouncedQuery.toLowerCase().split(/\s+/);
      const keywords = new Set<string>();
      
      data.videos.forEach((v: any) => {
        const titleMatches = queryWords.every(kw => v.title && v.title.toLowerCase().includes(kw));
        if (titleMatches && v.title) {
           keywords.add(v.title);
        }
        v.tags?.forEach((t: string) => {
           const tagMatches = queryWords.every(kw => t.toLowerCase().includes(kw));
           if (tagMatches) keywords.add(t);
        });
        v.categories?.forEach((c: string) => {
           const catMatches = queryWords.every(kw => c.toLowerCase().includes(kw));
           if (catMatches) keywords.add(c);
        });
      });
      
      return Array.from(keywords).slice(0, 8);
    },
    enabled: showSuggestionsOverlay && debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const filter: PaginationFilter = useMemo(() => ({
    searchQuery: queryTextUrl,
  }), [queryTextUrl]);

  const {
    data,
    isLoading: isLoadingResults,
    isError,
  } = usePaginationVideos(filter, 20, page);

  const videos = data?.videos || [];
  const totalPages = data?.totalPages || 1;

  const handleSelect = (term: string) => {
    saveRecentSearch(term);
    setQueryText(term);
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryText.trim()) {
      handleSelect(queryText.trim());
    }
  };

  const handleClear = () => {
    setQueryText('');
    inputRef.current?.focus();
    if (queryTextUrl) {
      navigate('/search');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex-1 flex flex-col w-full animate-fade-in">
      <SEO 
        title={queryTextUrl ? `Search results for "${queryTextUrl}" - DesiredHub` : 'Search - DesiredHub'}
        description={queryTextUrl ? `Browse search results for "${queryTextUrl}" on DesiredHub.` : 'Search for premium videos on DesiredHub.'}
        robots="noindex,follow"
      />

      {/* Premium Search Header (Using theme variables dynamically) */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800 py-3 px-4">
        <div className="container mx-auto max-w-4xl flex items-center gap-3">
          <button 
            type="button" 
            onClick={handleBack}
            className="p-2 -ml-2 text-neutral-400 hover:text-white rounded-full transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <form 
            onSubmit={handleSubmit} 
            className="flex-1 flex items-center bg-neutral-900 border border-neutral-800 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 shadow-sm rounded-full pl-4 pr-1.5 py-2 transition-all"
          >
            <SearchIcon className="w-5 h-5 text-neutral-400 shrink-0" />
            
            <input
              ref={inputRef}
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Search videos, tags, categories..."
              className="w-full bg-transparent border-none focus:ring-0 text-neutral-50 placeholder:text-neutral-500 px-3 py-0.5 text-base outline-none font-medium"
              autoComplete="off"
            />
            
            {queryText && (
              <button 
                type="button" 
                onClick={handleClear}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full shrink-0 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-6">
        {showSuggestionsOverlay ? (
          /* Suggestions / Recent / Popular Section */
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            {queryText.trim() ? (
              <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-sm">
                {isFetchingSuggestions && !suggestions.length ? (
                  <div className="px-4 py-12 flex flex-col items-center justify-center text-sm text-neutral-500 gap-3">
                     <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                     Searching...
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className="divide-y divide-neutral-800">
                    {suggestions.map((keyword: string, i: number) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => handleSelect(keyword)}
                          className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-neutral-800 transition-colors group"
                        >
                          <SearchIcon className="w-5 h-5 text-neutral-500 shrink-0 group-hover:text-primary transition-colors" />
                          <span className="text-[15px] font-medium text-neutral-100 line-clamp-1">{keyword}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-12 text-center text-[15px] text-neutral-500">
                     No suggestions found for <span className="text-neutral-100 font-semibold">"{queryText}"</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="text-sm font-bold text-neutral-100">Recent Searches</h3>
                      <button 
                        onClick={clearRecentSearches}
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {recentSearches.map((term, i) => (
                        <li key={`recent-${i}`}>
                          <div className="w-full flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors group">
                            <button
                              type="button"
                              onClick={() => handleSelect(term)}
                              className="flex-1 text-left px-4 py-3.5 flex items-center gap-3 text-base text-neutral-300 group-hover:text-neutral-100 transition-colors"
                            >
                              <Clock className="w-5 h-5 text-neutral-500 group-hover:text-primary transition-colors" />
                              <span className="font-medium truncate">{term}</span>
                            </button>
                            <button
                              onClick={(e) => removeRecentSearch(e, term)}
                              className="p-3 mr-1 text-neutral-500 hover:text-neutral-100 transition-colors shrink-0"
                              aria-label="Remove recent search"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Popular Searches */}
                {popularCategories.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-neutral-100 mb-4 px-2">Popular Categories</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {popularCategories.slice(0, 15).map((cat) => (
                        <button
                          key={`pop-${cat.id}`}
                          type="button"
                          onClick={() => handleSelect(cat.name)}
                          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full text-sm font-medium text-neutral-300 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all shadow-sm"
                        >
                          <TrendingUp className="w-4 h-4 opacity-70" />
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Search Results Section */
          <div className="animate-fade-in">
            <div className="mb-6 px-2">
              <h2 className="text-xl md:text-2xl font-bold text-neutral-100 flex items-center gap-2 tracking-tight">
                Results for "{queryTextUrl}"
              </h2>
            </div>
            
            {isError ? (
              <div className="text-center py-12">
                <p className="text-red-500 font-medium">Error loading search results. Please try again later.</p>
              </div>
            ) : !isLoadingResults && videos.length === 0 ? (
              <div className="text-center py-20 bg-neutral-900 rounded-3xl border border-neutral-800 shadow-sm max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <h2 className="text-xl font-semibold text-neutral-100 mb-2">No videos found</h2>
                <p className="text-neutral-400 max-w-md mx-auto">
                  Try another keyword or browse our popular categories.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
                  {isLoadingResults ? (
                    Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
                  ) : (
                    videos.map((video, index) => (
                      <Fragment key={video.id}>
                        <VideoCard video={video} />
                        {(index === 4) && <AdsterraNativeBanner />}
                      </Fragment>
                    ))
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10">
                    <Pagination currentPage={page} totalPages={totalPages} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
