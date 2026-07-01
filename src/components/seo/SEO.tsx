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

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Canonical URL */}
      {currentUrl && <link rel="canonical" href={currentUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="video.other" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      <link rel="canonical" href={currentUrl} />
    </Helmet>
  );
}
