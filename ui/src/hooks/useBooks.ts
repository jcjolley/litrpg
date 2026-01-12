import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types/book';
import { getBooks } from '../api/books';

interface UseBooksResult {
  books: Book[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBooks(): UseBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch books'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return { books, loading, error, refetch: fetchBooks };
}
