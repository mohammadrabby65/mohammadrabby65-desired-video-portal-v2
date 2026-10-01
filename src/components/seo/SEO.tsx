import { Helmet } from "react-helmet-async";
import { SITE_URL } from "../../config";

let hasHydrated = false;

export interface BreadcrumbItem {
  name: string;
  item: string;
}

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  exactTitle?: boolean;
  noIndex?: boolean;
  robots?: string;
  prevUrl?: string;
  nextUrl?: string;
  jsonLd?: any;
  breadcrumbs?: BreadcrumbItem[];
  ogType?: string;
  video?: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    duration?: string;
    contentUrl: string;
  };
}

export function SEO({
  title,
  description,
  image,
  url,
  exactTitle = false,
  noIndex = false,
  robots,
  prevUrl,
  nextUrl,
  jsonLd,
  breadcrumbs,
  ogType = "website",
  video,
}: SEOProps) {
  const isInitialSSR =
    typeof window !== "undefined" &&
    !hasHydrated &&
    !!document.querySelector('title[data-rh="true"]');
  if (typeof window !== "undefined" && !hasHydrated) {
    hasHydrated = true;
  }
  const skipCoreSeo = isInitialSSR;

  const siteTitle =
    "DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online";
  const fullTitle = exactTitle ? title : `${title} | ${siteTitle}`;
  let currentPath = "";
  let currentHost = "www.desiredhub.xyz";
  if (typeof window !== "undefined") {
    currentPath = window.location.pathname;
    currentHost = window.location.hostname;
    // Fallback for development environments
    if (currentHost === "localhost" || currentHost.includes("127.0.0.1") || currentHost.includes("run.app")) {
      currentHost = "www.desiredhub.xyz";
    }
    
    if (currentPath === "/search") {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get("q");
      if (q) {
        const canonicalParams = new URLSearchParams();
        canonicalParams.set("q", q);
        currentPath += `?${canonicalParams.toString()}`;
      }
    }
  }
  const baseUrl = `https://${currentHost}`;
  const currentUrl = url || `${baseUrl}${currentPath}`;
  const ogImage = image || "https://i.ibb.co.com/fV4JS3LH/20260701-143429.png";

  return (
    <Helmet>
      {!skipCoreSeo && (
        <>
          <title data-rh="true">{fullTitle}</title>
          <meta data-rh="true" name="description" content={description} />
          {currentUrl && (
            <link data-rh="true" rel="canonical" href={currentUrl} />
          )}
        </>
      )}
      <meta
        data-rh="true"
        name="robots"
        content={robots || (noIndex ? "noindex,nofollow" : "index,follow")}
      />

      {/* Canonical URL */}
      {prevUrl && <link data-rh="true" rel="prev" href={prevUrl} />}
      {nextUrl && <link data-rh="true" rel="next" href={nextUrl} />}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
      {breadcrumbs && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: b.name,
              item: b.item.startsWith("http") ? b.item : `https://${currentHost}${b.item}`,
            })),
          })}
        </script>
      )}

      {/* Multilingual Hreflang Tags */}
      <link data-rh="true" rel="alternate" hrefLang="en" href={`https://www.desiredhub.xyz${currentPath}`} />
      <link data-rh="true" rel="alternate" hrefLang="bn" href={`https://bd.desiredhub.xyz${currentPath}`} />
      <link data-rh="true" rel="alternate" hrefLang="hi" href={`https://hi.desiredhub.xyz${currentPath}`} />
      <link data-rh="true" rel="alternate" hrefLang="ar" href={`https://ar.desiredhub.xyz${currentPath}`} />
      <link data-rh="true" rel="alternate" hrefLang="x-default" href={`https://www.desiredhub.xyz${currentPath}`} />

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content="DesiredHub" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD for Video */}
      {video && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: video.name,
            description: video.description,
            thumbnailUrl: [video.thumbnailUrl],
            uploadDate: video.uploadDate,
            ...(video.duration && { duration: video.duration }),
            contentUrl: video.contentUrl,
          })}
        </script>
      )}
    </Helmet>
  );
}
