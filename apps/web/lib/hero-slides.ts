import { api } from './api';

export interface HeroSlide {
  id: string;
  titleEn: string;
  titleBn: string | null;
  subtitleEn: string;
  subtitleBn: string | null;
  imageUrl: string;
  ctaTextEn: string | null;
  ctaTextBn: string | null;
  ctaLink: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    return await api<HeroSlide[]>('/hero-slides');
  } catch {
    return [];
  }
}

export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  return api<HeroSlide[]>('/admin/hero-slides');
}

export async function createHeroSlide(data: Partial<HeroSlide>) {
  return api<HeroSlide>('/admin/hero-slides', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateHeroSlide(id: string, data: Partial<HeroSlide>) {
  return api<HeroSlide>(`/admin/hero-slides/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteHeroSlide(id: string) {
  return api<void>(`/admin/hero-slides/${id}`, { method: 'DELETE' });
}

export async function reorderHeroSlides(items: { id: string; sortOrder: number }[]) {
  return api<HeroSlide[]>('/admin/hero-slides/reorder', { method: 'PATCH', body: JSON.stringify({ items }) });
}
