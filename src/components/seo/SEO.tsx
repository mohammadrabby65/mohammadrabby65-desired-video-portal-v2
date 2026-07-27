import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../../config';
import { useState, useEffect } from 'react';

let isFirstClientRender = typeof window !== 'undefined' && !!document.querySelector('title[data-rh="true"]');

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
  video?: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    duration?: string;
    contentUrl: string;
  };
}

export function SEO({ title, description, image, url, exactTitle = false, noIndex = false, robots, prevUrl, nextUrl, jsonLd, breadcrumbs, video }: SEOProps) {
  const [skipCoreSeo, setSkipCoreSeo] = useState(isFirstClientRender);

  useEffect(() => {
    if (isFirstClientRender) {
      isFirstClientRender = false;
      setSkipCoreSeo(false);
    }
  }, []);

  const siteTitle = 'DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online';
  const fullTitle = exactTitle ? title : `${title} | ${siteTitle}`;
  let currentPath = '';
  if (typeof window !== 'undefined') {
    currentPath = window.location.pathname;
    if (currentPath === '/search') {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q');
      if (q) {
        const canonicalParams = new URLSearchParams();
        canonicalParams.set('q', q);
        currentPath += `?${canonicalParams.toString()}`;
      }
    }
  }
  const currentUrl = url || `${SITE_URL}${currentPath}`;
  const ogImage = image || 'https://i.ibb.co.com/fV4JS3LH/20260701-143429.png';


  return (
    <Helmet>
      {!skipCoreSeo && (
        <>
          <title data-rh="true">{fullTitle}</title>
          <meta data-rh="true" name="description" content={description} />
          {currentUrl && <link data-rh="true" rel="canonical" href={currentUrl} />}
        </>
      )}
      <meta data-rh="true" name="robots" content={robots || (noIndex ? "noindex,nofollow" : "index,follow")} />
      
      {/* Canonical URL */}
      {prevUrl && <link data-rh="true" rel="prev" href={prevUrl} />}
      {nextUrl && <link data-rh="true" rel="next" href={nextUrl} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
      {breadcrumbs && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs.map((b, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "name": b.name,
              "item": b.item.startsWith("http") ? b.item : `${SITE_URL}${b.item}`
            }))
          })}
        </script>
      )}

      
      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content="DesiredHub" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content="website" />
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
