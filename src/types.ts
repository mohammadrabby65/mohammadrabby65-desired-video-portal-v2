export interface VideoPost {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  videoUrl: string;
  description: string;
  category: string;
  tags: string[];
  duration: string;
  quality?: "SD" | "HD" | "Full HD" | "2K" | "4K";
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
}

export interface SiteSettings {
  id: string;
  siteName: string;
  logoUrl: string;
  heroBannerUrl: string;
  seoTitle: string;
  seoDescription: string;
}

