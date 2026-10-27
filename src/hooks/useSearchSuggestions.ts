import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VideoPost } from "../types";
import { usePublicCategories } from "./useCategories";
import { normalizeCategory } from "./useVideos";

export interface VideoSuggestion {
  type: "video";
  key: string;
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  duration?: string;
  category?: string;
}

export interface CategorySuggestion {
  type: "category";
  key: string;
  name: string;
  slug: string;
}

export interface KeywordSuggestion {
  type: "keyword";
  key: string;
  keyword: string;
}

export type SearchSuggestion =
  | VideoSuggestion
  | CategorySuggestion
  | KeywordSuggestion;

const MAX_VIDEO_THUMBNAIL_SUGGESTIONS = 4;
const MAX_CATEGORY_SUGGESTIONS = 2;
const MAX_TOTAL_SUGGESTIONS = 8;

export function useSearchSuggestions(debouncedQuery: string, enabled = true) {
  const queryClient = useQueryClient();
  const trimmedQuery = debouncedQuery.trim();
  const isQueryActive = enabled && trimmedQuery.length > 0;

  const { data: publicCategories = [] } = usePublicCategories(enabled);

  const { data: apiVideos = [], isFetching } = useQuery({
    queryKey: ["search-suggestions", trimmedQuery.toLowerCase()],
    queryFn: async () => {
      if (!trimmedQuery) return [] as VideoPost[];
      const res = await fetch(
        `/api/videos?q=${encodeURIComponent(trimmedQuery)}&limitCount=20`,
      );
      if (!res.ok) return [] as VideoPost[];
      const data = await res.json();
      return (Array.isArray(data?.videos) ? data.videos : []) as VideoPost[];
    },
    enabled: isQueryActive,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (!trimmedQuery) return [];

    const queryWords = trimmedQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (queryWords.length === 0) return [];

    // Reuse any already-cached VideoPost objects in React Query alongside the snapshot API response
    const postMap = new Map<string, VideoPost>();
    for (const v of apiVideos) {
      if (v && v.id && v.title) {
        postMap.set(v.id, v);
      }
    }

    const cachedQueries = queryClient.getQueriesData({ queryKey: ["videos"] });
    for (const [, data] of cachedQueries) {
      if (!data) continue;
      const anyData = data as any;
      const list: VideoPost[] = [];
      if (Array.isArray(anyData)) {
        list.push(...anyData);
      } else if (Array.isArray(anyData.videos)) {
        list.push(...anyData.videos);
      } else if (Array.isArray(anyData.pages)) {
        for (const p of anyData.pages) {
          if (Array.isArray(p?.videos)) list.push(...p.videos);
        }
      }
      for (const v of list) {
        if (v && v.id && v.title && !postMap.has(v.id)) {
          postMap.set(v.id, v);
        }
      }
    }

    const allPosts = Array.from(postMap.values());

    // 1. Selected Video Suggestions (exact post object -> title + thumbnailUrl + slug + duration + category)
    const titleMatchingPosts: VideoPost[] = [];
    for (const post of allPosts) {
      if (!post.title || !(post.slug || post.id)) continue;
      const lowerTitle = post.title.toLowerCase();
      const matchesAllWords = queryWords.every((kw) => lowerTitle.includes(kw));
      if (matchesAllWords) {
        titleMatchingPosts.push(post);
      }
    }

    const selectedVideoPosts = titleMatchingPosts.slice(
      0,
      MAX_VIDEO_THUMBNAIL_SUGGESTIONS,
    );
    const videoSuggestions: VideoSuggestion[] = selectedVideoPosts.map(
      (post) => ({
        type: "video",
        key: `video-${post.id}`,
        id: post.id,
        slug: post.slug || post.id,
        title: post.title,
        thumbnailUrl: post.thumbnailUrl || "",
        duration: post.duration || undefined,
        category:
          Array.isArray(post.categories) && post.categories.length > 0
            ? post.categories[0]
            : undefined,
      }),
    );

    // 2. Category Suggestions (text-only)
    const categoryMap = new Map<string, CategorySuggestion>();
    for (const cat of publicCategories) {
      if (!cat?.name) continue;
      const slug = cat.slug || normalizeCategory(cat.name);
      const lowerName = cat.name.toLowerCase();
      const lowerSlug = slug.toLowerCase();
      if (
        queryWords.every(
          (kw) => lowerName.includes(kw) || lowerSlug.includes(kw),
        )
      ) {
        const normKey = normalizeCategory(slug);
        if (!categoryMap.has(normKey)) {
          categoryMap.set(normKey, {
            type: "category",
            key: `cat-${normKey}`,
            name: cat.name,
            slug,
          });
        }
      }
    }

    for (const post of allPosts) {
      if (!Array.isArray(post.categories)) continue;
      for (const rawCat of post.categories) {
        if (!rawCat) continue;
        const lowerCat = rawCat.toLowerCase();
        if (queryWords.every((kw) => lowerCat.includes(kw))) {
          const normKey = normalizeCategory(rawCat);
          if (!categoryMap.has(normKey)) {
            const matchedPublic = publicCategories.find(
              (c) =>
                normalizeCategory(c.slug) === normKey ||
                normalizeCategory(c.name) === normKey,
            );
            categoryMap.set(normKey, {
              type: "category",
              key: `cat-${normKey}`,
              name: matchedPublic?.name || rawCat,
              slug: matchedPublic?.slug || normKey,
            });
          }
        }
      }
    }

    const categorySuggestions = Array.from(categoryMap.values()).slice(
      0,
      MAX_CATEGORY_SUGGESTIONS,
    );

    // 3. Keyword Suggestions (text-only)
    const keywordMap = new Map<string, KeywordSuggestion>();
    const addKeyword = (term: string) => {
      const cleaned = term.trim();
      if (!cleaned) return;
      const lower = cleaned.toLowerCase();
      if (keywordMap.has(lower)) return;
      keywordMap.set(lower, {
        type: "keyword",
        key: `kw-${lower}`,
        keyword: cleaned,
      });
    };

    // Include matching tags from posts as text-only keyword suggestions
    for (const post of allPosts) {
      if (!Array.isArray(post.tags)) continue;
      for (const tag of post.tags) {
        if (!tag) continue;
        const lowerTag = tag.toLowerCase();
        if (queryWords.every((kw) => lowerTag.includes(kw))) {
          addKeyword(tag);
        }
      }
    }

    // Any extra title matches beyond the top selected video thumbnail rows become text-only keyword suggestions
    for (const extraPost of titleMatchingPosts.slice(
      MAX_VIDEO_THUMBNAIL_SUGGESTIONS,
    )) {
      if (extraPost.title) {
        addKeyword(extraPost.title);
      }
    }

    // Always include at least one text-only keyword search row when video/category matches exist
    // so that not every row in the dropdown is a video thumbnail row
    if (
      keywordMap.size === 0 &&
      (videoSuggestions.length > 0 || categorySuggestions.length > 0)
    ) {
      addKeyword(trimmedQuery);
    }

    const remainingSlots = Math.max(
      1,
      MAX_TOTAL_SUGGESTIONS -
        videoSuggestions.length -
        categorySuggestions.length,
    );
    const keywordSuggestions = Array.from(keywordMap.values()).slice(
      0,
      remainingSlots,
    );

    return [
      ...videoSuggestions,
      ...categorySuggestions,
      ...keywordSuggestions,
    ];
  }, [trimmedQuery, apiVideos, publicCategories, queryClient]);

  return {
    suggestions,
    isFetching,
  };
}
