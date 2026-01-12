import { useEffect, useState, useCallback } from 'react';
import type { Book } from '../../types/book';
import { CarouselTrack } from './CarouselTrack';
import { useCarouselSpin } from '../../hooks/useCarouselSpin';
import { useWeightedSelection } from '../../hooks/useWeightedSelection';
import styles from './Carousel.module.css';

interface CarouselProps {
  books: Book[];
  userWishlist: string[];
  onBookSelected: (book: Book) => void;
  triggerSpin?: boolean;
  onSpinStart?: () => void;
  onWishlist?: () => void;
  onSpinAgain?: () => void;
  onIgnore?: () => void;
  onCoverClick?: () => void;
  selectedBookId?: string | null;
}

export function Carousel({
  books,
  userWishlist,
  onBookSelected,
  triggerSpin,
  onSpinStart,
  onWishlist,
  onSpinAgain,
  onIgnore,
  onCoverClick,
  selectedBookId,
}: CarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { selectBook, getTargetIndex } = useWeightedSelection();

  const handleSpinComplete = useCallback(
    (targetIndex: number) => {
      setSelectedIndex(targetIndex);
      const book = books[targetIndex];
      if (book) {
        onBookSelected(book);
      }
    },
    [books, onBookSelected]
  );

  const { angle, spinState, startSpin, reset } = useCarouselSpin({
    itemCount: books.length,
    spinDuration: 4000,
    onSpinComplete: handleSpinComplete,
  });

  const doSpin = useCallback(() => {
    if (books.length === 0 || spinState === 'spinning') return;

    const targetBook = selectBook(books, userWishlist);
    if (!targetBook) return;

    const targetIndex = getTargetIndex(books, targetBook);
    setSelectedIndex(null);
    onSpinStart?.();
    startSpin(targetIndex);
  }, [books, userWishlist, spinState, selectBook, getTargetIndex, startSpin, onSpinStart]);

  // Auto-spin on mount
  useEffect(() => {
    if (books.length > 0 && spinState === 'idle') {
      const timer = setTimeout(doSpin, 500);
      return () => clearTimeout(timer);
    }
  }, [books.length]);

  // Handle external spin trigger
  useEffect(() => {
    if (triggerSpin && spinState === 'stopped') {
      reset();
      const timer = setTimeout(doSpin, 100);
      return () => clearTimeout(timer);
    }
  }, [triggerSpin]);

  const isInWishlist = selectedBookId ? userWishlist.includes(selectedBookId) : false;

  if (books.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No books available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.viewport}>
        <CarouselTrack
          books={books}
          angle={angle}
          selectedIndex={selectedIndex}
          spinning={spinState === 'spinning'}
          onWishlist={onWishlist}
          onSpinAgain={onSpinAgain}
          onIgnore={onIgnore}
          onCoverClick={onCoverClick}
          isInWishlist={isInWishlist}
        />
      </div>
    </div>
  );
}
