import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Book } from '../types/book';

const CAROUSEL_MAX_SIZE = 15;
const REPLENISH_THRESHOLD = CAROUSEL_MAX_SIZE; // Replenish after each removal

interface UseCarouselPoolOptions {
  /** Series-grouped, filtered books from the holding cell */
  holdingCell: Book[];
  /** Book IDs the user has already seen (landed on) */
  seenBookIds: Set<string>;
  /** Book IDs marked as not interested */
  notInterestedIds: string[];
  /** -1 (niche) to 1 (popular), 0 = pure random */
  popularityWeight: number;
}

interface UseCarouselPoolResult {
  /** Up to 30 books for the carousel */
  carouselBooks: Book[];
  /** Remove a book immediately (e.g., when marked not interested) */
  removeBook: (bookId: string) => void;
  /** Force refresh the carousel pool */
  refresh: () => void;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Select books with weighting based on popularity score.
 * When weight > 0, favors popular books.
 * When weight < 0, favors niche books.
 * When weight = 0, pure random.
 */
function selectWeightedBooks(
  books: Book[],
  count: number,
  weight: number
): Book[] {
  if (books.length === 0) return [];
  if (books.length <= count) return [...books];

  if (weight === 0) {
    // Pure random selection
    return shuffleArray(books).slice(0, count);
  }

  // Calculate popularity score for each book
  const scored = books.map(book => ({
    book,
    score: book.wishlistCount + book.clickThroughCount,
  }));

  // Sort by score (descending for popular, ascending for niche)
  if (weight > 0) {
    scored.sort((a, b) => b.score - a.score);
  } else {
    scored.sort((a, b) => a.score - b.score);
  }

  // Use weighted random selection
  // Higher |weight| = more deterministic (favor top of sorted list)
  // Lower |weight| = more random
  const absWeight = Math.abs(weight);
  const selected: Book[] = [];
  const remaining = [...scored];

  while (selected.length < count && remaining.length > 0) {
    // Calculate selection probabilities
    // Books at the top of the list get higher probability
    const totalWeight = remaining.reduce((sum, _, idx) => {
      // Exponential decay based on position and weight
      // Position 0 gets weight 1, position n gets weight (1-absWeight)^n
      return sum + Math.pow(1 - absWeight * 0.5, idx);
    }, 0);

    let random = Math.random() * totalWeight;
    let selectedIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const itemWeight = Math.pow(1 - absWeight * 0.5, i);
      random -= itemWeight;
      if (random <= 0) {
        selectedIdx = i;
        break;
      }
    }

    selected.push(remaining[selectedIdx].book);
    remaining.splice(selectedIdx, 1);
  }

  return selected;
}

export function useCarouselPool({
  holdingCell,
  seenBookIds,
  notInterestedIds,
  popularityWeight,
}: UseCarouselPoolOptions): UseCarouselPoolResult {
  // Track book IDs currently in the carousel pool
  const [carouselBookIds, setCarouselBookIds] = useState<Set<string>>(new Set());

  // Track if we've done initial selection
  const initializedRef = useRef(false);

  // Previous values for change detection
  const prevHoldingCellLengthRef = useRef(holdingCell.length);
  const prevPopularityWeightRef = useRef(popularityWeight);

  // Get available books (in holding cell, not in not-interested)
  const availableBooks = useMemo(() => {
    const notInterestedSet = new Set(notInterestedIds);
    return holdingCell.filter(book => !notInterestedSet.has(book.id));
  }, [holdingCell, notInterestedIds]);

  // Get current carousel books (resolve IDs to Book objects)
  const carouselBooks = useMemo(() => {
    const bookMap = new Map(availableBooks.map(b => [b.id, b]));
    return Array.from(carouselBookIds)
      .map(id => bookMap.get(id))
      .filter((book): book is Book => book !== undefined);
  }, [availableBooks, carouselBookIds]);

  // Count fresh books (in carousel but not seen)
  const freshCount = useMemo(() => {
    return carouselBooks.filter(book => !seenBookIds.has(book.id)).length;
  }, [carouselBooks, seenBookIds]);

  // Select new books for the carousel
  const selectBooks = useCallback((
    count: number,
    excludeIds: Set<string>
  ): Book[] => {
    const candidates = availableBooks.filter(book => !excludeIds.has(book.id));
    return selectWeightedBooks(candidates, count, popularityWeight);
  }, [availableBooks, popularityWeight]);

  // Initialize or refresh the carousel pool
  const refresh = useCallback(() => {
    const newBooks = selectBooks(CAROUSEL_MAX_SIZE, new Set());
    setCarouselBookIds(new Set(newBooks.map(b => b.id)));
  }, [selectBooks]);

  // Remove a book from the carousel
  const removeBook = useCallback((bookId: string) => {
    setCarouselBookIds(prev => {
      const next = new Set(prev);
      next.delete(bookId);
      return next;
    });
  }, []);

  // Replenish the carousel if needed
  const replenish = useCallback(() => {
    const needed = CAROUSEL_MAX_SIZE - carouselBookIds.size;
    if (needed <= 0) return;

    const newBooks = selectBooks(needed, carouselBookIds);
    if (newBooks.length > 0) {
      setCarouselBookIds(prev => {
        const next = new Set(prev);
        newBooks.forEach(book => next.add(book.id));
        return next;
      });
    }
  }, [carouselBookIds, selectBooks]);

  // Initial selection when holding cell first has books
  useEffect(() => {
    if (!initializedRef.current && holdingCell.length > 0) {
      initializedRef.current = true;
      refresh();
    }
  }, [holdingCell.length, refresh]);

  // Refresh when popularity weight changes
  useEffect(() => {
    if (initializedRef.current && prevPopularityWeightRef.current !== popularityWeight) {
      prevPopularityWeightRef.current = popularityWeight;
      refresh();
    }
  }, [popularityWeight, refresh]);

  // Check for replenishment when fresh count drops
  useEffect(() => {
    if (!initializedRef.current) return;

    // Check if we need to replenish
    const availableInHolding = availableBooks.filter(b => !carouselBookIds.has(b.id)).length;

    if (freshCount < REPLENISH_THRESHOLD && availableInHolding > 0) {
      replenish();
    }
  }, [freshCount, availableBooks, carouselBookIds, replenish]);

  // Clean up carousel when books are removed from holding cell
  useEffect(() => {
    if (prevHoldingCellLengthRef.current !== holdingCell.length) {
      prevHoldingCellLengthRef.current = holdingCell.length;

      // Remove any carousel books that no longer exist in holding cell
      const holdingCellIds = new Set(holdingCell.map(b => b.id));
      setCarouselBookIds(prev => {
        const next = new Set<string>();
        prev.forEach(id => {
          if (holdingCellIds.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
    }
  }, [holdingCell]);

  return {
    carouselBooks,
    removeBook,
    refresh,
  };
}
