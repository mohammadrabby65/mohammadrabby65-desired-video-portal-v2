import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SEO } from '../components/seo/SEO';
import { Helmet } from 'react-helmet-async';
import { VideoPost, Category } from '../types';

export function Sitemap() {
  const { data, isLoading } = useQuery({
    queryKey: ['html-sitemap'],
    queryFn: async () => {
      // Categories
      const categoriesQ = query(
        collection(db, 'categories'),
        orderBy('name', 'asc')
      );
      const catSnap = await getDocs(categoriesQ);
      let categories = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      categories = categories.filter(c => c.isActive !== false).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      // Latest Videos (100)
      const latestQ = query(
        collection(db, 'posts'),
        orderBy('publishedAt', 'desc'),
        limit(100)
      );
      const latestSnap = await getDocs(latestQ);
      const latestVideos = latestSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));

      // Popular Videos (100)
      const popularQ = query(
        collection(db, 'posts'),
        orderBy('views', 'desc'),
        limit(100)
      );
      const popularSnap = await getDocs(popularQ);
      const popularVideos = popularSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPost));

      return {
        categories,
        latestVideos,
        popularVideos,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "HTML Sitemap",
    description: "HTML Sitemap of DesiredHub. Find all categories and top videos.",
    url: typeof window !== "undefined" ? window.location.href : "",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: typeof window !== "undefined" ? window.location.origin : "",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Sitemap",
          item: typeof window !== "undefined" ? window.location.href : "",
        },
      ],
    },
  };

  return (
    <div className="flex-1 pb-16 pt-8">
      <SEO 
         title="HTML Sitemap" 
         description="HTML Sitemap of DesiredHub. Browse all our video categories, latest videos, and popular videos."
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex text-neutral-400 text-sm mb-6">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li className="text-neutral-200">Sitemap</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold text-white mb-8">HTML Sitemap</h1>

        {isLoading ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-4 bg-neutral-800 rounded w-1/4"></div>
            <div className="h-4 bg-neutral-800 rounded w-1/3"></div>
            <div className="h-4 bg-neutral-800 rounded w-1/2"></div>
          </div>
        ) : data ? (
          <div className="space-y-12">
            
            {/* Pages Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-800 pb-2">Main Pages</h2>
              <ul className="flex flex-col gap-2">
                <li>
                  <Link to="/" className="text-red-500 hover:text-red-400 transition-colors">Homepage</Link>
                </li>
                <li>
                  <Link to="/categories" className="text-red-500 hover:text-red-400 transition-colors">All Categories</Link>
                </li>
              </ul>
            </section>

            {/* Categories Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-800 pb-2">Categories</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.categories.map(cat => (
                  <li key={cat.id}>
                    <Link to={`/category/${cat.slug}`} className="text-neutral-300 hover:text-white transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Latest Videos Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-800 pb-2">Latest Videos</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.latestVideos.map(video => (
                  <li key={video.id} className="truncate">
                    <Link to={`/video/${video.slug}`} className="text-neutral-300 hover:text-white transition-colors" title={video.title}>
                      {video.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Popular Videos Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-800 pb-2">Popular Videos</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.popularVideos.map(video => (
                  <li key={video.id} className="truncate">
                    <Link to={`/video/${video.slug}`} className="text-neutral-300 hover:text-white transition-colors" title={video.title}>
                      {video.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

          </div>
        ) : null}
      </div>
    </div>
  );
}
