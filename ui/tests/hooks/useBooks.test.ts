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
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  it('should fetch books with limit on initial load', async () => {
    const mockBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValueOnce(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetBooks).toHaveBeenCalledWith({ limit: 30 });
    expect(result.current.books.length).toBe(30);
  });

  it('should deduplicate books when refilling pool', async () => {
    // Initial load - 30 books
    const initialBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValueOnce(initialBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Refill with some duplicates and some new books
    const refillBooks = [
      ...Array.from({ length: 10 }, (_, i) => createMockBook(`book-${i}`)), // duplicates
      ...Array.from({ length: 20 }, (_, i) => createMockBook(`new-book-${i}`)), // new books
    ];
    mockGetBooks.mockResolvedValueOnce(refillBooks);

    await act(async () => {
      await result.current.refillPool();
    });

    // Should have 30 original + 20 new = 50 books (duplicates removed)
    expect(result.current.books.length).toBe(50);
  });

  it('should not trigger concurrent refills', async () => {
    const mockBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValue(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock calls from initial load
    mockGetBooks.mockClear();

    // Trigger multiple refills simultaneously
    await act(async () => {
      // Start multiple refills without waiting
      const refill1 = result.current.refillPool();
      const refill2 = result.current.refillPool();
      const refill3 = result.current.refillPool();

      await Promise.all([refill1, refill2, refill3]);
    });

    // Should only have called getBooks once due to isRefilling guard
    expect(mockGetBooks).toHaveBeenCalledTimes(1);
  });

  it('should reset spin count after refill', async () => {
    const mockBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValue(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Increment spin count multiple times
    act(() => {
      result.current.incrementSpinCount();
      result.current.incrementSpinCount();
      result.current.incrementSpinCount();
    });

    expect(result.current.spinCount).toBe(3);

    // Refill pool
    await act(async () => {
      await result.current.refillPool();
    });

    // Spin count should be reset
    expect(result.current.spinCount).toBe(0);
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

  it('should handle refill errors without crashing', async () => {
    const mockBooks = Array.from({ length: 30 }, (_, i) => createMockBook(`book-${i}`));
    mockGetBooks.mockResolvedValueOnce(mockBooks);

    const { result } = renderHook(() => useBooks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Make refill fail
    mockGetBooks.mockRejectedValueOnce(new Error('Refill failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.refillPool();
    });

    // Should log error but not crash
    expect(consoleSpy).toHaveBeenCalledWith('Failed to refill book pool:', expect.any(Error));

    // Original books should still be present
    expect(result.current.books.length).toBe(30);

    consoleSpy.mockRestore();
  });
});
