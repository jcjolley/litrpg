import type { Book } from '../types/book';

export type SeriesDisplayMode = 'first' | 'latest';

export interface SeriesGroupResult {
  /** Books to display in carousel based on mode + standalone books */
  visibleBooks: Book[];
  /** Map from series name (lowercase) to all books in that series, sorted by position */
  seriesMap: Map<string, Book[]>;
}

/**
 * Normalize series name for grouping (case-insensitive comparison)
 */
function normalizeSeriesName(series: string): string {
  return series.toLowerCase().trim();
}

/**
 * Groups books by series and returns visible books for carousel display.
 *
 * - Books with no series (standalone) are always visible
 * - For series, shows first or latest book based on mode
 * - seriesMap contains all books grouped by series for tooltip display
 *
 * @param books - The filtered books to group
 * @param mode - 'first' shows lowest-numbered book, 'latest' shows highest-numbered book
 */
export function groupBooksBySeries(books: Book[], mode: SeriesDisplayMode = 'first'): SeriesGroupResult {
  const seriesMap = new Map<string, Book[]>();
  const standaloneBooks: Book[] = [];

  // Group books by series
  for (const book of books) {
    if (!book.series) {
      standaloneBooks.push(book);
      continue;
    }

    const normalizedSeries = normalizeSeriesName(book.series);
    const existing = seriesMap.get(normalizedSeries) || [];
    existing.push(book);
    seriesMap.set(normalizedSeries, existing);
  }

  // Sort each series by seriesPosition, then by addedAt as tiebreaker
  for (const [key, seriesBooks] of seriesMap) {
    seriesBooks.sort((a, b) => {
      const posA = a.seriesPosition ?? Number.MAX_SAFE_INTEGER;
      const posB = b.seriesPosition ?? Number.MAX_SAFE_INTEGER;

      if (posA !== posB) {
        return posA - posB;
      }

      // Tiebreaker: earlier addedAt wins
      if (posA === posB && posA !== Number.MAX_SAFE_INTEGER) {
        console.warn(
          `Duplicate series position ${posA} in series "${a.series}": "${a.title}" vs "${b.title}"`
        );
      }
      return (a.addedAt || 0) - (b.addedAt || 0);
    });
    seriesMap.set(key, seriesBooks);
  }

  // Build visible books based on mode + standalones
  const visibleBooks: Book[] = [...standaloneBooks];

  for (const seriesBooks of seriesMap.values()) {
    if (seriesBooks.length > 0) {
      // 'first' = index 0 (lowest position), 'latest' = last index (highest position)
      const bookToShow = mode === 'first' ? seriesBooks[0] : seriesBooks[seriesBooks.length - 1];
      visibleBooks.push(bookToShow);
    }
  }

  return { visibleBooks, seriesMap };
}

/**
 * Get all books in a series by the series name from a book.
 * Returns empty array if book has no series or series not found.
 */
export function getSeriesBooks(
  seriesMap: Map<string, Book[]>,
  book: Book
): Book[] {
  if (!book.series) return [];
  const normalizedSeries = normalizeSeriesName(book.series);
  return seriesMap.get(normalizedSeries) || [];
}

/**
 * Check if a series has multiple books (tooltip should be shown)
 */
export function seriesHasMultipleBooks(
  seriesMap: Map<string, Book[]>,
  book: Book
): boolean {
  const books = getSeriesBooks(seriesMap, book);
  return books.length > 1;
}
