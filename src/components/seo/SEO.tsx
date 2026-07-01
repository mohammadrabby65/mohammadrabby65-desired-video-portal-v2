import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  exactTitle?: boolean;
}

export function SEO({ title, description, image, url, exactTitle = false }: SEOProps) {
  const siteTitle = 'Desired - Free Desi Porn & Hot Indian Sex Videos Online';
  const fullTitle = exactTitle ? title : `${title} | ${siteTitle}`;
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const ogImage = image || 'https://i.ibb.co.com/fV4JS3LH/20260701-143429.png';
  const faviconUrl = 'https://i.ibb.co.com/WvbgTSjV/Desired-icon.png';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content="#000000" />
      
      {/* Favicons & Icons */}
      <link rel="icon" type="image/png" sizes="16x16" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="32x32" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="48x48" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="192x192" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="512x512" href={faviconUrl} />
      <link rel="apple-touch-icon" sizes="180x180" href={faviconUrl} />
      <link rel="manifest" href="/manifest.json" />
      
      {/* Canonical URL */}
      {currentUrl && <link rel="canonical" href={currentUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content="DESIRED" />
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
    </Helmet>
  );
}
