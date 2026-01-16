import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Book } from '../types/book';
import { getBooks, type BookFilters, type CategoryFilters, EMPTY_FILTERS, getFilterValues } from '../api/books';
import { groupBooksBySeries } from '../utils/seriesGrouping';

const FILTERS_KEY = 'litrpg-filters';
const BOOKS_CACHE_KEY = 'litrpg-books-cache';

// Migrate old single-value filters to new tri-state format
function migrateOldFilters(stored: unknown): BookFilters {
  if (!stored || typeof stored !== 'object') {
    return EMPTY_FILTERS;
  }

  const old = stored as Record<string, unknown>;

  // Check if already in new format (has nested objects with filter states)
  if (old.genre && typeof old.genre === 'object' && !Array.isArray(old.genre)) {
    return stored as BookFilters;
  }

  // Migrate old format: { genre: "Cultivation" } -> { genre: { "Cultivation": "include" } }
  const migrated: BookFilters = { ...EMPTY_FILTERS };

  const categories = ['genre', 'author', 'narrator', 'length', 'popularity', 'source'] as const;
  for (const cat of categories) {
    if (old[cat] && typeof old[cat] === 'string') {
      migrated[cat] = { [old[cat] as string]: 'include' };
    }
  }

  return migrated;
}

function loadStoredFilters(): BookFilters {
  try {
    const stored = localStorage.getItem(FILTERS_KEY);
    if (!stored) return EMPTY_FILTERS;
    return migrateOldFilters(JSON.parse(stored));
  } catch {
    return EMPTY_FILTERS;
  }
}

function loadCachedBooks(): Book[] {
  try {
    const stored = localStorage.getItem(BOOKS_CACHE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveBooksToCache(books: Book[]): void {
  try {
    localStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify(books));
  } catch (err) {
    console.error('Failed to save books to localStorage:', err);
  }
}

function getMaxAddedAt(books: Book[]): number {
  if (books.length === 0) return 0;
  return Math.max(...books.map((b) => b.addedAt || 0));
}

// Special value for uncategorized items (empty genres array, etc.)
const UNCATEGORIZED = '__uncategorized__';

// Get the book's value(s) for a given filter category
// Returns an array for multi-value categories (genre), or wraps single value in array
function getBookValues(book: Book, category: keyof BookFilters): string[] {
  switch (category) {
    case 'genre':
      // Multi-genre: return all genres, or [UNCATEGORIZED] if empty
      return book.genres.length > 0 ? book.genres : [UNCATEGORIZED];
    case 'author':
      return book.author ? [book.author] : [];
    case 'narrator':
      return book.narrator ? [book.narrator] : [];
    case 'length': {
      // Map length string to category
      if (!book.length) return [];
      const hours = parseFloat(book.length.split(' ')[0]) || 0;
      if (hours < 10) return ['Short'];
      if (hours < 20) return ['Medium'];
      if (hours < 40) return ['Long'];
      return ['Epic'];
    }
    case 'popularity': {
      // Map based on metrics
      const score = book.wishlistCount + book.clickThroughCount;
      return score > 10 ? ['popular'] : ['niche'];
    }
    case 'source':
      return book.source ? [book.source] : [];
    default:
      return [];
  }
}

// Apply tri-state filters to books
// For multi-value categories (genre): OR logic for includes, ANY match excludes
function applyFilters(books: Book[], filters: BookFilters): Book[] {
  return books.filter(book => {
    for (const [category, categoryFilters] of Object.entries(filters) as [keyof BookFilters, CategoryFilters][]) {
      const includes = getFilterValues(categoryFilters, 'include');
      const excludes = getFilterValues(categoryFilters, 'exclude');

      if (includes.length === 0 && excludes.length === 0) {
        continue; // No filters for this category
      }

      const bookValues = getBookValues(book, category);

      // If there are include filters, book must match at least one (OR logic)
      if (includes.length > 0) {
        const hasMatch = bookValues.some(v => includes.includes(v));
        if (!hasMatch) {
          return false;
        }
      }

      // If there are exclude filters, book must not match any
      if (excludes.length > 0) {
        const hasExcluded = bookValues.some(v => excludes.includes(v));
        if (hasExcluded) {
          return false;
        }
      }
    }
    return true;
  });
}

interface UseBooksResult {
  books: Book[];           // Filtered books for display (series-grouped: only first book of each series)
  allBooks: Book[];        // All books (unfiltered, not grouped) - the full catalog
  seriesMap: Map<string, Book[]>;  // Map of series name to all books in series
  loading: boolean;
  error: Error | null;
  filters: BookFilters;
  setFilters: (filters: BookFilters) => void;
  refetch: () => Promise<void>;
}

export function useBooks(): UseBooksResult {
  const [allBooks, setAllBooks] = useState<Book[]>(loadCachedBooks);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<BookFilters>(loadStoredFilters);

  // Fetch books - uses incremental sync if cache exists
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cachedBooks = loadCachedBooks();
      const maxAddedAt = getMaxAddedAt(cachedBooks);

      // If we have cached books, only fetch new ones since maxAddedAt
      // Otherwise, fetch all books
      const newBooks = await getBooks(maxAddedAt > 0 ? { since: maxAddedAt } : {});

      if (maxAddedAt > 0 && newBooks.length > 0) {
        // Merge new books with cached books (dedupe by ID)
        const existingIds = new Set(cachedBooks.map((b) => b.id));
        const uniqueNew = newBooks.filter((b) => !existingIds.has(b.id));
        const merged = [...cachedBooks, ...uniqueNew];
        setAllBooks(merged);
        saveBooksToCache(merged);
      } else if (maxAddedAt === 0) {
        // No cache - use fetched books as the full catalog
        setAllBooks(newBooks);
        saveBooksToCache(newBooks);
      } else {
        // Cache exists but no new books - use cached data
        setAllBooks(cachedBooks);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch books'));
      // On error, still try to use cached books
      const cachedBooks = loadCachedBooks();
      if (cachedBooks.length > 0) {
        setAllBooks(cachedBooks);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch books on mount
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Apply filters client-side
  const filteredBooks = useMemo(() => applyFilters(allBooks, filters), [allBooks, filters]);

  // Group filtered books by series - only show first book of each series
  const { visibleBooks: books, seriesMap } = useMemo(
    () => groupBooksBySeries(filteredBooks),
    [filteredBooks]
  );

  const handleSetFilters = useCallback((newFilters: BookFilters) => {
    setFilters(newFilters);
    localStorage.setItem(FILTERS_KEY, JSON.stringify(newFilters));
  }, []);

  const refetch = useCallback(async () => {
    await fetchBooks();
  }, [fetchBooks]);

  return {
    books,
    allBooks,
    seriesMap,
    loading,
    error,
    filters,
    setFilters: handleSetFilters,
    refetch,
  };
}
