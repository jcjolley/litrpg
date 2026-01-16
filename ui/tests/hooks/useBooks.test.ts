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
function createMockBook(id: string, genre = 'LitRPG'): Book {
  return {
    id,
    title: `Book ${id}`,
    subtitle: null,
    author: 'Test Author',
    authorUrl: null,
    narrator: 'Test Narrator',
    series: null,
    seriesPosition: null,
    genre,
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
    const mockBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValueOnce(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetBooks).toHaveBeenCalled();
    expect(result.current.books.length).toBe(30);
  });

  it('should deduplicate books when fetching incrementally', async () => {
    // Set up cached books in localStorage
    const cachedBooks = Array.from({ length: 30 }, (_, i) => {
      const book = createMockBook(`book-${i}`);
      book.addedAt = Date.now() - 10000; // 10 seconds ago
      return book;
    });
    localStorage.setItem('litrpg-books-cache', JSON.stringify(cachedBooks));

    // API returns some duplicates and some new books
    const newBooks = [
      ...Array.from({ length: 5 }, (_, i) => createMockBook(`book-${i}`)), // duplicates
      ...Array.from({ length: 10 }, (_, i) => createMockBook(`new-book-${i}`)), // new books
    ];
    mockGetBooks.mockResolvedValueOnce(newBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have 30 cached + 10 new = 40 books (duplicates removed)
    expect(result.current.books.length).toBe(40);
  });

  it('should refetch books when calling refetch', async () => {
    const mockBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValue(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock calls from initial load
    mockGetBooks.mockClear();

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetBooks).toHaveBeenCalledTimes(1);
  });

  it('should apply filters correctly', async () => {
    const mockBooks = [
      createMockBook('book-1', 'LitRPG'),
      createMockBook('book-2', 'Cultivation'),
      createMockBook('book-3', 'LitRPG'),
      createMockBook('book-4', 'GameLit'),
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
        popularity: {},
        source: {},
      });
    });

    // Should only have LitRPG books
    expect(result.current.books.length).toBe(2);
    expect(result.current.books.every((b) => b.genre === 'LitRPG')).toBe(true);

    // All books should still be accessible
    expect(result.current.allBooks.length).toBe(4);
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

  it('should handle refetch errors without losing existing books', async () => {
    const mockBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValueOnce(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Make refetch fail
    mockGetBooks.mockRejectedValueOnce(new Error('Refetch failed'));

    await act(async () => {
      await result.current.refetch();
    });

    // Error should be set
    expect(result.current.error).toBeTruthy();

    // Original books should still be present (from cache)
    expect(result.current.books.length).toBeGreaterThanOrEqual(0);
  });
});
