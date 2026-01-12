import { useCallback } from 'react';
import type { Book } from '../types/book';
import { selectWeightedRandom, findBookIndex } from '../utils/weightedRandom';

interface UseWeightedSelectionResult {
  selectBook: (books: Book[], userWishlist: string[]) => Book | null;
  getTargetIndex: (books: Book[], targetBook: Book) => number;
}

export function useWeightedSelection(): UseWeightedSelectionResult {
  const selectBook = useCallback(
    (books: Book[], userWishlist: string[]): Book | null => {
      return selectWeightedRandom(books, userWishlist);
    },
    []
  );

  const getTargetIndex = useCallback(
    (books: Book[], targetBook: Book): number => {
      return findBookIndex(books, targetBook.id);
    },
    []
  );

  return { selectBook, getTargetIndex };
}
