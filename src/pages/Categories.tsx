import { usePublicCategories } from '../hooks/useCategories';
import { Link } from 'react-router-dom';
import { Category } from '../types';
import { SEO } from '../components/seo/SEO';

import { Helmet } from 'react-helmet-async';

// Define an interface extending Category to include total videos count
interface CategoryWithCount extends Category {
  totalVideos?: number;
}

export function Categories() {
  const { data: rawCategories = [], isLoading, error } = usePublicCategories();
  const categories = [...rawCategories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All Categories",
    description: "Browse all video categories.",
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
          name: "Categories",
          item: typeof window !== "undefined" ? window.location.href : "",
        },
      ],
    },
  };

  return (
    <div className="flex-1 pb-16 pt-8">
      <SEO 
        title="All Categories" 
        description="Browse all video categories."
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-8">Categories</h1>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : error ? ( <div>Error: {error.message}</div> ) : categories?.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
            <h2 className="text-xl font-semibold text-white mb-2">No categories found</h2>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories?.map((cat) => (
              <Link 
                key={cat.id} 
                to={`/category/${cat.slug}`}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors block"
              >
                {cat.thumbnailUrl ? (
                  <img 
                    src={cat.thumbnailUrl} 
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-neutral-500 font-medium">No Image</span>
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="text-white font-bold text-lg mb-1">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
