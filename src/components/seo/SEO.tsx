import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../../config';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  exactTitle?: boolean;
  noIndex?: boolean;
  prevUrl?: string;
  nextUrl?: string;
  jsonLd?: any;
  video?: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    duration?: string;
    contentUrl: string;
  };
}

export function SEO({ title, description, image, url, exactTitle = false, noIndex = false, prevUrl, nextUrl, jsonLd, video }: SEOProps) {
  const siteTitle = 'DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online';
  const fullTitle = exactTitle ? title : `${title} | ${siteTitle}`;
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentUrl = url || `${SITE_URL}${currentPath}`;
  const ogImage = image || 'https://i.ibb.co.com/fV4JS3LH/20260701-143429.png';


  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? "noindex,nofollow" : "index,follow"} />
      
      {/* Canonical URL */}
      {currentUrl && <link rel="canonical" href={currentUrl} />}
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}

      
      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content="DesiredHub" />
      <meta property="og:type" content="video.other" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

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
