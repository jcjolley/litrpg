import type { Book } from '../types/book';

interface WeightedBook {
  book: Book;
  weight: number;
}

/**
 * Calculate weight for a book based on metrics.
 *
 * Factors:
 * - Lower impressions = higher weight (fresher books get shown more)
 * - Higher wishlist/clicks = higher weight (popular books)
 * - Recently added = bonus weight
 * - Already wishlisted by user = 0 weight (exclude)
 */
export function calculateBookWeight(
  book: Book,
  userWishlist: string[],
  maxImpressions: number
): number {
  // Exclude books already in user's wishlist
  if (userWishlist.includes(book.id)) {
    return 0;
  }

  // Base weight
  let weight = 100;

  // Impression penalty (more impressions = less likely to show)
  // Normalize by max impressions to keep scale reasonable
  const impressionRatio = maxImpressions > 0
    ? book.impressionCount / maxImpressions
    : 0;
  weight -= impressionRatio * 50;

  // Wishlist/click bonus (engagement signals quality)
  const engagementScore = book.wishlistCount * 2 + book.clickThroughCount;
  weight += Math.min(engagementScore * 5, 30);

  // Recency bonus (added in last 30 days)
  const daysSinceAdded = (Date.now() - new Date(book.addedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceAdded < 30) {
    weight += 20 * (1 - daysSinceAdded / 30);
  }

  // Rating bonus
  if (book.rating >= 4.5) {
    weight += 15;
  } else if (book.rating >= 4.0) {
    weight += 10;
  }

  // Ensure minimum weight
  return Math.max(weight, 1);
}

/**
 * Select a random book using weighted probability
 */
export function selectWeightedRandom(
  books: Book[],
  userWishlist: string[]
): Book | null {
  if (books.length === 0) return null;

  const maxImpressions = Math.max(...books.map((b) => b.impressionCount), 1);

  const weightedBooks: WeightedBook[] = books.map((book) => ({
    book,
    weight: calculateBookWeight(book, userWishlist, maxImpressions),
  }));

  // Filter out zero-weight books
  const eligible = weightedBooks.filter((wb) => wb.weight > 0);

  if (eligible.length === 0) {
    // If all books are wishlisted, just pick a random one
    return books[Math.floor(Math.random() * books.length)];
  }

  const totalWeight = eligible.reduce((sum, wb) => sum + wb.weight, 0);
  let random = Math.random() * totalWeight;

  for (const wb of eligible) {
    random -= wb.weight;
    if (random <= 0) {
      return wb.book;
    }
  }

  // Fallback
  return eligible[eligible.length - 1].book;
}

/**
 * Find the index of a book in an array
 */
export function findBookIndex(books: Book[], targetId: string): number {
  return books.findIndex((b) => b.id === targetId);
}
