import { fetchApi } from './client';
import type { Book } from '../types/book';

export interface BookFilters {
  genre?: string;
  length?: string;
  popularity?: string;
  limit?: number;
}

export async function getBooks(filters?: BookFilters): Promise<Book[]> {
  const params = new URLSearchParams();

  if (filters?.genre) params.set('genre', filters.genre);
  if (filters?.length) params.set('length', filters.length);
  if (filters?.popularity) params.set('popularity', filters.popularity);
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `/books?${queryString}` : '/books';

  return fetchApi<Book[]>(url);
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
