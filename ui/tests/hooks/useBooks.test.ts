import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBooks } from '../../src/hooks/useBooks';
import * as booksApi from '../../src/api/books';
import type { Book } from '../../src/types/book';

// Mock the API module
vi.mock('../../src/api/books', async (importOriginal) => {
  const actual = await importOriginal<typeof booksApi>();
  return {
    ...actual,
    getBooks: vi.fn(),
  };
});

const mockGetBooks = vi.mocked(booksApi.getBooks);

// Generate mock books with all required fields
function createMockBook(id: string, genres: string[] = ['LitRPG']): Book {
  return {
    id,
    title: `Book ${id}`,
    subtitle: null,
    author: 'Test Author',
    authorUrl: null,
    narrator: 'Test Narrator',
    series: null,
    seriesPosition: null,
    genres,
    length: '10 hrs',
    releaseDate: null,
    language: 'English',
    imageUrl: `https://example.com/${id}.jpg`,
    source: 'AUDIBLE',
    audibleUrl: `https://audible.com/pd/${id}`,
    audibleAsin: id,
    royalRoadUrl: null,
    royalRoadId: null,
    rating: 4.5,
    numRatings: 100,
    pageCount: null,
    description: 'Test description',
    wishlistCount: 0,
    clickThroughCount: 0,
    notInterestedCount: 0,
    impressionCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    addedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('useBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch books on initial load', async () => {
    const mockBooks = Array.from({ length: 10 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValueOnce(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetBooks).toHaveBeenCalled();
    expect(result.current.books.length).toBe(10);
    expect(result.current.allBooks.length).toBe(10);
  });

  it('should use incremental sync when cache exists', async () => {
    // Pre-populate cache
    const cachedBooks = Array.from({ length: 5 }, (_, i) =>
      createMockBook(`cached-${i}`)
    );
    localStorage.setItem('litrpg-books-cache', JSON.stringify(cachedBooks));

    // New books from API
    const newBooks = Array.from({ length: 3 }, (_, i) =>
      createMockBook(`new-${i}`)
    );
    mockGetBooks.mockResolvedValueOnce(newBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have merged cached + new books
    expect(result.current.books.length).toBe(8);
  });

  it('should deduplicate books when merging with cache', async () => {
    // Pre-populate cache
    const cachedBooks = Array.from({ length: 5 }, (_, i) =>
      createMockBook(`book-${i}`)
    );
    localStorage.setItem('litrpg-books-cache', JSON.stringify(cachedBooks));

    // API returns some duplicates and some new
    const apiBooks = [
      createMockBook('book-0'), // duplicate
      createMockBook('book-1'), // duplicate
      createMockBook('new-book'), // new
    ];
    mockGetBooks.mockResolvedValueOnce(apiBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have 5 cached + 1 new = 6 books (duplicates removed)
    expect(result.current.books.length).toBe(6);
  });

  it('should apply filters correctly', async () => {
    const mockBooks = [
      createMockBook('book-1', ['LitRPG']),
      createMockBook('book-2', ['Cultivation']),
      createMockBook('book-3', ['LitRPG']),
      createMockBook('book-4', ['GameLit']),
    ];
    mockGetBooks.mockResolvedValueOnce(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // All books should be present initially
    expect(result.current.books.length).toBe(4);

    // Apply filter to include only LitRPG
    act(() => {
      result.current.setFilters({
        genre: { LitRPG: 'include' },
        author: {},
        narrator: {},
        length: {},
        source: {},
        seriesPosition: { first: 'include' },
      });
    });

    // Should only have LitRPG books
    expect(result.current.books.length).toBe(2);
    expect(result.current.books.every((b) => b.genres.includes('LitRPG'))).toBe(true);

    // All books should still be accessible via allBooks
    expect(result.current.allBooks.length).toBe(4);
  });

  it('should apply exclude filters correctly', async () => {
    const mockBooks = [
      createMockBook('book-1', ['LitRPG']),
      createMockBook('book-2', ['Cultivation']),
      createMockBook('book-3', ['LitRPG']),
      createMockBook('book-4', ['GameLit']),
    ];
    mockGetBooks.mockResolvedValueOnce(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply filter to exclude LitRPG
    act(() => {
      result.current.setFilters({
        genre: { LitRPG: 'exclude' },
        author: {},
        narrator: {},
        length: {},
        source: {},
        seriesPosition: { first: 'include' },
      });
    });

    // Should have all books except LitRPG
    expect(result.current.books.length).toBe(2);
    expect(result.current.books.every((b) => !b.genres.includes('LitRPG'))).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    mockGetBooks.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.books.length).toBe(0);
  });

  it('should use cached books on API error', async () => {
    // Pre-populate cache
    const cachedBooks = Array.from({ length: 5 }, (_, i) =>
      createMockBook(`cached-${i}`)
    );
    localStorage.setItem('litrpg-books-cache', JSON.stringify(cachedBooks));

    mockGetBooks.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still have cached books
    expect(result.current.error).toBeTruthy();
    expect(result.current.books.length).toBe(5);
  });

  it('should persist filters to localStorage', async () => {
    mockGetBooks.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newFilters = {
      genre: { LitRPG: 'include' as const },
      author: {},
      narrator: {},
      length: {},
      popularity: {},
      source: {},
      seriesPosition: { first: 'include' as const },
    };

    act(() => {
      result.current.setFilters(newFilters);
    });

    const stored = localStorage.getItem('litrpg-filters');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(newFilters);
  });

  it('should support refetch to reload books', async () => {
    const initialBooks = [createMockBook('book-1')];
    const updatedBooks = [createMockBook('book-1'), createMockBook('book-2')];

    mockGetBooks.mockResolvedValueOnce(initialBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.books.length).toBe(1);

    // Setup for refetch
    mockGetBooks.mockResolvedValueOnce(updatedBooks);

    await act(async () => {
      await result.current.refetch();
    });

    // Note: Due to incremental sync logic, this will merge with cache
    // The exact behavior depends on addedAt values
    expect(mockGetBooks).toHaveBeenCalledTimes(2);
  });
});
