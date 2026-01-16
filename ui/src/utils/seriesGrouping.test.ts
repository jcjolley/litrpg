import { describe, it, expect } from 'vitest';
import {
  groupBooksBySeries,
  getSeriesBooks,
  seriesHasMultipleBooks,
} from './seriesGrouping';
import type { Book } from '../types/book';

// Helper to create minimal book objects for testing
function createBook(overrides: Partial<Book>): Book {
  return {
    id: overrides.id || 'test-id',
    title: overrides.title || 'Test Book',
    subtitle: null,
    author: 'Test Author',
    authorUrl: null,
    narrator: null,
    series: overrides.series ?? null,
    seriesPosition: overrides.seriesPosition ?? null,
    genre: null,
    length: null,
    releaseDate: null,
    language: 'English',
    imageUrl: 'https://example.com/image.jpg',
    source: 'AUDIBLE',
    audibleUrl: null,
    audibleAsin: null,
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
    addedAt: overrides.addedAt || Date.now(),
    updatedAt: Date.now(),
  };
}

describe('groupBooksBySeries', () => {
  it('returns standalone books in visibleBooks', () => {
    const books = [
      createBook({ id: '1', title: 'Standalone 1', series: null }),
      createBook({ id: '2', title: 'Standalone 2', series: null }),
    ];

    const result = groupBooksBySeries(books);

    expect(result.visibleBooks).toHaveLength(2);
    expect(result.visibleBooks.map((b) => b.id)).toContain('1');
    expect(result.visibleBooks.map((b) => b.id)).toContain('2');
    expect(result.seriesMap.size).toBe(0);
  });

  it('shows only Book 1 for a series with multiple books', () => {
    const books = [
      createBook({ id: '1', title: 'Series Book 1', series: 'Epic Series', seriesPosition: 1 }),
      createBook({ id: '2', title: 'Series Book 2', series: 'Epic Series', seriesPosition: 2 }),
      createBook({ id: '3', title: 'Series Book 3', series: 'Epic Series', seriesPosition: 3 }),
    ];

    const result = groupBooksBySeries(books);

    expect(result.visibleBooks).toHaveLength(1);
    expect(result.visibleBooks[0].id).toBe('1');
    expect(result.visibleBooks[0].seriesPosition).toBe(1);
  });

  it('shows lowest-numbered book when Book 1 is missing', () => {
    const books = [
      createBook({ id: '2', title: 'Series Book 2', series: 'Epic Series', seriesPosition: 2 }),
      createBook({ id: '3', title: 'Series Book 3', series: 'Epic Series', seriesPosition: 3 }),
      createBook({ id: '5', title: 'Series Book 5', series: 'Epic Series', seriesPosition: 5 }),
    ];

    const result = groupBooksBySeries(books);

    expect(result.visibleBooks).toHaveLength(1);
    expect(result.visibleBooks[0].id).toBe('2');
    expect(result.visibleBooks[0].seriesPosition).toBe(2);
  });

  it('groups series case-insensitively', () => {
    const books = [
      createBook({ id: '1', title: 'Book 1', series: 'The Primal Hunter', seriesPosition: 1 }),
      createBook({ id: '2', title: 'Book 2', series: 'THE PRIMAL HUNTER', seriesPosition: 2 }),
      createBook({ id: '3', title: 'Book 3', series: 'the primal hunter', seriesPosition: 3 }),
    ];

    const result = groupBooksBySeries(books);

    expect(result.visibleBooks).toHaveLength(1);
    expect(result.seriesMap.size).toBe(1);

    const seriesBooks = result.seriesMap.get('the primal hunter');
    expect(seriesBooks).toHaveLength(3);
  });

  it('handles mixed standalone and series books', () => {
    const books = [
      createBook({ id: 's1', title: 'Standalone', series: null }),
      createBook({ id: 'a1', title: 'Series A Book 1', series: 'Series A', seriesPosition: 1 }),
      createBook({ id: 'a2', title: 'Series A Book 2', series: 'Series A', seriesPosition: 2 }),
      createBook({ id: 'b1', title: 'Series B Book 1', series: 'Series B', seriesPosition: 1 }),
    ];

    const result = groupBooksBySeries(books);

    expect(result.visibleBooks).toHaveLength(3); // 1 standalone + 2 series first books
    expect(result.visibleBooks.map((b) => b.id).sort()).toEqual(['a1', 'b1', 's1']);
  });

  it('sorts series books by position', () => {
    const books = [
      createBook({ id: '3', title: 'Book 3', series: 'Epic', seriesPosition: 3 }),
      createBook({ id: '1', title: 'Book 1', series: 'Epic', seriesPosition: 1 }),
      createBook({ id: '2', title: 'Book 2', series: 'Epic', seriesPosition: 2 }),
    ];

    const result = groupBooksBySeries(books);
    const seriesBooks = result.seriesMap.get('epic');

    expect(seriesBooks).toBeDefined();
    expect(seriesBooks!.map((b) => b.seriesPosition)).toEqual([1, 2, 3]);
  });

  it('uses addedAt as tiebreaker for duplicate positions', () => {
    const books = [
      createBook({ id: '1b', title: 'Book 1 (later)', series: 'Epic', seriesPosition: 1, addedAt: 2000 }),
      createBook({ id: '1a', title: 'Book 1 (earlier)', series: 'Epic', seriesPosition: 1, addedAt: 1000 }),
    ];

    const result = groupBooksBySeries(books);
    const seriesBooks = result.seriesMap.get('epic');

    expect(seriesBooks).toBeDefined();
    expect(seriesBooks![0].id).toBe('1a'); // Earlier addedAt wins
  });

  it('handles books with null seriesPosition', () => {
    const books = [
      createBook({ id: '1', title: 'Book with position', series: 'Epic', seriesPosition: 1 }),
      createBook({ id: '2', title: 'Book without position', series: 'Epic', seriesPosition: null }),
    ];

    const result = groupBooksBySeries(books);
    const seriesBooks = result.seriesMap.get('epic');

    expect(seriesBooks).toBeDefined();
    // Book with position should come first
    expect(seriesBooks![0].id).toBe('1');
    expect(seriesBooks![1].id).toBe('2');
  });

  it('populates seriesMap with all books for each series', () => {
    const books = [
      createBook({ id: '1', series: 'A', seriesPosition: 1 }),
      createBook({ id: '2', series: 'A', seriesPosition: 2 }),
      createBook({ id: '3', series: 'B', seriesPosition: 1 }),
    ];

    const result = groupBooksBySeries(books);

    expect(result.seriesMap.get('a')).toHaveLength(2);
    expect(result.seriesMap.get('b')).toHaveLength(1);
  });
});

describe('getSeriesBooks', () => {
  it('returns all books in the same series', () => {
    const books = [
      createBook({ id: '1', series: 'Epic', seriesPosition: 1 }),
      createBook({ id: '2', series: 'Epic', seriesPosition: 2 }),
      createBook({ id: '3', series: 'Other', seriesPosition: 1 }),
    ];

    const { seriesMap } = groupBooksBySeries(books);
    const book1 = books[0];
    const seriesBooks = getSeriesBooks(seriesMap, book1);

    expect(seriesBooks).toHaveLength(2);
    expect(seriesBooks.map((b) => b.id)).toEqual(['1', '2']);
  });

  it('returns empty array for standalone books', () => {
    const books = [createBook({ id: '1', series: null })];
    const { seriesMap } = groupBooksBySeries(books);

    const result = getSeriesBooks(seriesMap, books[0]);
    expect(result).toEqual([]);
  });

  it('handles case-insensitive lookup', () => {
    const books = [
      createBook({ id: '1', series: 'Epic Series', seriesPosition: 1 }),
      createBook({ id: '2', series: 'EPIC SERIES', seriesPosition: 2 }),
    ];

    const { seriesMap } = groupBooksBySeries(books);
    const seriesBooks = getSeriesBooks(seriesMap, books[0]);

    expect(seriesBooks).toHaveLength(2);
  });
});

describe('seriesHasMultipleBooks', () => {
  it('returns true for series with multiple books', () => {
    const books = [
      createBook({ id: '1', series: 'Epic', seriesPosition: 1 }),
      createBook({ id: '2', series: 'Epic', seriesPosition: 2 }),
    ];

    const { seriesMap } = groupBooksBySeries(books);
    expect(seriesHasMultipleBooks(seriesMap, books[0])).toBe(true);
  });

  it('returns false for series with only one book', () => {
    const books = [createBook({ id: '1', series: 'Solo', seriesPosition: 1 })];

    const { seriesMap } = groupBooksBySeries(books);
    expect(seriesHasMultipleBooks(seriesMap, books[0])).toBe(false);
  });

  it('returns false for standalone books', () => {
    const books = [createBook({ id: '1', series: null })];

    const { seriesMap } = groupBooksBySeries(books);
    expect(seriesHasMultipleBooks(seriesMap, books[0])).toBe(false);
  });
});
