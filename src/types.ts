export interface VideoPost {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  videoUrl: string;
  description: string;
  categories: string[];
  tags: string[];
  searchTerms?: string[];
  duration: string;
  quality?: string;
  badges?: string[];
  publishedAt: any;
  views: number;
  featured: boolean;
  trending: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl?: string;
  displayOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  logoUrl: string;
  heroBannerUrl: string;
  seoTitle: string;
  seoDescription: string;
}

