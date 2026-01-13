import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types/book';
import { getBooks, type BookFilters } from '../api/books';

const FILTERS_KEY = 'litrpg-filters';

function loadStoredFilters(): BookFilters {
  try {
    const stored = localStorage.getItem(FILTERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

interface UseBooksOptions {
  bookLimit?: number;
}

interface UseBooksResult {
  books: Book[];
  loading: boolean;
  error: Error | null;
  filters: BookFilters;
  setFilters: (filters: BookFilters) => void;
  refetch: () => Promise<void>;
}

export function useBooks(options: UseBooksOptions = {}): UseBooksResult {
  const { bookLimit } = options;
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<BookFilters>(loadStoredFilters);

  const fetchBooks = useCallback(
    async (currentFilters: BookFilters) => {
      setLoading(true);
      setError(null);
      try {
        const filtersWithLimit = { ...currentFilters, limit: bookLimit };
        const data = await getBooks(filtersWithLimit);
        setBooks(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch books'));
      } finally {
        setLoading(false);
      }
    },
    [bookLimit]
  );

  // Fetch when filters or bookLimit change
  useEffect(() => {
    fetchBooks(filters);
  }, [filters, fetchBooks]);

  const handleSetFilters = useCallback((newFilters: BookFilters) => {
    setFilters(newFilters);
    localStorage.setItem(FILTERS_KEY, JSON.stringify(newFilters));
  }, []);

  const refetch = useCallback(async () => {
    await fetchBooks(filters);
  }, [fetchBooks, filters]);

  return { books, loading, error, filters, setFilters: handleSetFilters, refetch };
}
