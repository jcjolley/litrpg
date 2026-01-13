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
  continuousSpin?: boolean; // When true, spin indefinitely until released
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
  continuousSpin = false,
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

  const { angle, spinState, startSpin, startContinuousSpin, stopAndLand } = useCarouselSpin({
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

  // Land on a random weighted book (used when exiting continuous spin)
  const doLand = useCallback(() => {
    if (books.length === 0) return;

    const targetBook = selectBook(books, userWishlist);
    if (!targetBook) return;

    const targetIndex = getTargetIndex(books, targetBook);
    setSelectedIndex(null);
    onSpinStart?.();
    stopAndLand(targetIndex);
  }, [books, userWishlist, selectBook, getTargetIndex, stopAndLand, onSpinStart]);

  // Handle clicking on a non-selected card to focus it
  const handleCardClick = useCallback((index: number) => {
    if (spinState === 'spinning' || spinState === 'continuous') return;
    setSelectedIndex(null);
    startSpin(index);
  }, [spinState, startSpin]);

  // Start continuous spin on mount if continuousSpin is true
  useEffect(() => {
    if (books.length > 0 && continuousSpin && spinState === 'idle') {
      startContinuousSpin();
    }
  }, [books.length, continuousSpin, spinState, startContinuousSpin]);

  // Handle transition from continuous spin to landing
  useEffect(() => {
    if (!continuousSpin && spinState === 'continuous') {
      doLand();
    }
  }, [continuousSpin, spinState, doLand]);

  // Auto-spin on mount (only if not in continuous mode)
  useEffect(() => {
    if (books.length > 0 && spinState === 'idle' && !continuousSpin) {
      const timer = setTimeout(doSpin, 500);
      return () => clearTimeout(timer);
    }
  }, [books.length, continuousSpin]);

  // Handle external spin trigger
  useEffect(() => {
    if (triggerSpin && spinState === 'stopped') {
      doSpin();
    }
  }, [triggerSpin]);

  const isInWishlist = selectedBookId ? userWishlist.includes(selectedBookId) : false;
  const showActions = spinState === 'stopped' && selectedIndex !== null;

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
          spinning={spinState === 'spinning' || spinState === 'continuous'}
          onCoverClick={onCoverClick}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Floating action bar - appears when stopped */}
      {showActions && (
        <div className={styles.actionBar}>
          <button
            className={`${styles.actionButton} ${styles.actionPrimary}`}
            onClick={onWishlist}
            disabled={isInWishlist}
            type="button"
          >
            {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionSecondary}`}
            onClick={onSpinAgain}
            type="button"
          >
            Spin Again
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionDanger}`}
            onClick={onIgnore}
            type="button"
          >
            Not Interested
          </button>
        </div>
      )}
    </div>
  );
}
