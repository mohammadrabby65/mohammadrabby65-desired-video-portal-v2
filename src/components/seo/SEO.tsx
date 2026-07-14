import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  exactTitle?: boolean;
  noIndex?: boolean;
  prevUrl?: string;
  nextUrl?: string;
  jsonLd?: any;
  video?: any;
}

export function SEO({ title, exactTitle = false }: SEOProps) {
  const siteTitle = 'DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online';
  const fullTitle = exactTitle ? title : `${title} | ${siteTitle}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
    </Helmet>
  );
}

