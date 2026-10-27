import React, { useState, useEffect } from "react";
import { Search as SearchIcon, Film, Folder, Clock } from "lucide-react";
import {
  SearchSuggestion,
  VideoSuggestion,
  CategorySuggestion,
  KeywordSuggestion,
} from "../../hooks/useSearchSuggestions";

interface SuggestionThumbnailProps {
  src: string;
  alt: string;
  compact?: boolean;
}

function SuggestionThumbnail({ src, alt, compact = false }: SuggestionThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizeClasses = compact
    ? "w-14 h-8 rounded-md"
    : "w-14 h-8 sm:w-16 sm:h-9 rounded-md";

  if (!src || hasError) {
    return (
      <div
        className={`${sizeClasses} bg-neutral-800 border border-neutral-700/60 flex items-center justify-center shrink-0 text-neutral-500`}
        aria-hidden="true"
      >
        <Film className="w-3.5 h-3.5 opacity-70" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} bg-neutral-800 border border-neutral-700/60 overflow-hidden shrink-0 relative`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover block"
      />
    </div>
  );
}

interface SearchSuggestionsListProps {
  suggestions: SearchSuggestion[];
  isFetching: boolean;
  queryText: string;
  onSelectVideo: (suggestion: VideoSuggestion) => void;
  onSelectCategory: (suggestion: CategorySuggestion) => void;
  onSelectKeyword: (suggestion: KeywordSuggestion) => void;
  compact?: boolean;
}

export function SearchSuggestionsList({
  suggestions,
  isFetching,
  queryText,
  onSelectVideo,
  onSelectCategory,
  onSelectKeyword,
  compact = false,
}: SearchSuggestionsListProps) {
  if (isFetching && suggestions.length === 0) {
    return (
      <div
        className={`${
          compact ? "px-4 py-6" : "px-4 py-10"
        } flex flex-col items-center justify-center text-xs sm:text-sm text-neutral-400 gap-2.5`}
      >
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span>Searching...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div
        className={`${
          compact ? "px-4 py-6 text-xs sm:text-sm" : "px-4 py-10 text-sm sm:text-[15px]"
        } text-center text-neutral-400`}
      >
        No suggestions found for{" "}
        <span className="text-neutral-100 font-semibold">"{queryText}"</span>
      </div>
    );
  }

  const rowPadding = compact
    ? "px-3 py-2 sm:px-3.5 sm:py-2.5"
    : "px-3.5 py-2.5 sm:px-4 sm:py-3";

  return (
    <ul className="divide-y divide-neutral-800/80" role="listbox">
      {suggestions.map((item) => {
        if (item.type === "video") {
          return (
            <li key={item.key} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onSelectVideo(item)}
                className={`w-full text-left ${rowPadding} flex items-center gap-3 hover:bg-neutral-800/80 active:bg-neutral-800 transition-colors group`}
              >
                <SuggestionThumbnail
                  src={item.thumbnailUrl}
                  alt={item.title}
                  compact={compact}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-neutral-100 line-clamp-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  {(item.category || item.duration) && (
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 leading-tight">
                      {item.category && (
                        <span className="truncate max-w-[140px] sm:max-w-[180px] text-neutral-400">
                          {item.category}
                        </span>
                      )}
                      {item.category && item.duration && (
                        <span aria-hidden="true" className="text-neutral-600">
                          •
                        </span>
                      )}
                      {item.duration && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] sm:text-[11px] text-neutral-300 shrink-0">
                          <Clock className="w-2.5 h-2.5 text-neutral-500" />
                          {item.duration}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        }

        if (item.type === "category") {
          return (
            <li key={item.key} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onSelectCategory(item)}
                className={`w-full text-left ${rowPadding} flex items-center justify-between gap-3 hover:bg-neutral-800/80 active:bg-neutral-800 transition-colors group`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Folder className="w-4 h-4 text-primary/80 shrink-0 group-hover:text-primary transition-colors" />
                  <span className="text-xs sm:text-sm font-medium text-neutral-100 line-clamp-1 group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/60 shrink-0">
                  Category
                </span>
              </button>
            </li>
          );
        }

        return (
          <li key={item.key} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => onSelectKeyword(item)}
              className={`w-full text-left ${rowPadding} flex items-center gap-3 hover:bg-neutral-800/80 active:bg-neutral-800 transition-colors group`}
            >
              <SearchIcon className="w-4 h-4 text-neutral-500 shrink-0 group-hover:text-primary transition-colors" />
              <span className="text-xs sm:text-sm font-medium text-neutral-200 line-clamp-1 group-hover:text-white transition-colors">
                {item.keyword}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
