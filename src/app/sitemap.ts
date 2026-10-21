import type { MetadataRoute } from 'next';
import { brand } from '@/data/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${brand.url}/`, changeFrequency: 'monthly' }];
}
