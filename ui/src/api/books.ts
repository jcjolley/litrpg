import { fetchApi } from './client';
import type { Book } from '../types/book';

export type FilterState = 'neutral' | 'include' | 'exclude';

export interface CategoryFilters {
  [value: string]: FilterState;
}

export interface BookFilters {
  genre: CategoryFilters;
  author: CategoryFilters;
  narrator: CategoryFilters;
  length: CategoryFilters;
  popularity: CategoryFilters;
  source: CategoryFilters;
}

// Empty filters constant
export const EMPTY_FILTERS: BookFilters = {
  genre: {},
  author: {},
  narrator: {},
  length: {},
  popularity: {},
  source: {},
};

export async function getBooks(): Promise<Book[]> {
  return fetchApi<Book[]>('/books');
}

// Helper to get values with a specific filter state
export function getFilterValues(category: CategoryFilters, state: FilterState): string[] {
  return Object.entries(category)
    .filter(([_, s]) => s === state)
    .map(([value]) => value);
}

// Check if any filters are active
export function hasActiveFilters(filters: BookFilters): boolean {
  return Object.values(filters).some(category =>
    Object.values(category).some(state => state !== 'neutral')
  );
}

export async function getAuthors(search?: string, limit = 20): Promise<string[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', limit.toString());
  return fetchApi<string[]>(`/books/authors?${params.toString()}`);
}

export async function getNarrators(search?: string, limit = 20): Promise<string[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', limit.toString());
  return fetchApi<string[]>(`/books/narrators?${params.toString()}`);
}

export async function recordImpression(bookId: string): Promise<void> {
  return fetchApi<void>(`/books/${bookId}/impression`, {
    method: 'POST',
  });
}

export async function recordClick(bookId: string): Promise<void> {
  return fetchApi<void>(`/books/${bookId}/click`, {
    method: 'POST',
  });
}

export async function recordWishlist(bookId: string): Promise<void> {
  return fetchApi<void>(`/books/${bookId}/wishlist`, {
    method: 'POST',
  });
}

export async function recordNotInterested(bookId: string): Promise<void> {
  return fetchApi<void>(`/books/${bookId}/not-interested`, {
    method: 'POST',
  });
}

export async function recordUpvote(bookId: string): Promise<void> {
  return fetchApi<void>(`/books/${bookId}/upvote`, {
    method: 'POST',
  });
}

export async function recordDownvote(bookId: string): Promise<void> {
  return fetchApi<void>(`/books/${bookId}/downvote`, {
    method: 'POST',
  });
}
