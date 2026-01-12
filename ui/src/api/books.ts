import { fetchApi } from './client';
import type { Book } from '../types/book';

export async function getBooks(): Promise<Book[]> {
  return fetchApi<Book[]>('/books');
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
