import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo, type TouchEvent } from 'react';
import type { Book } from '../../types/book';
import type { VoteType } from '../../hooks/useVotes';
import { CarouselTrack } from './CarouselTrack';
import { useCarouselSpin } from '../../hooks/useCarouselSpin';
import { useWeightedSelection } from '../../hooks/useWeightedSelection';
import styles from './Carousel.module.css';

// Hook to observe container dimensions
function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Use useLayoutEffect to measure synchronously after render
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Measure immediately
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: rect.width, height: rect.height });
    }

    // Observe for future changes
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []); // Empty deps - runs once after DOM is ready

  return size;
}

interface CarouselProps {
  books: Book[];
  seriesMap?: Map<string, Book[]>;  // Map of series to books for tooltip
  userWishlist: string[];
  userVotes: { [bookId: string]: VoteType };
  onBookSelected: (book: Book) => void;
  triggerSpin?: boolean;
  onSpinStart?: () => void;
  onWishlist?: () => void;
  onCompleted?: () => void;
  onSpinAgain?: () => void;
  onIgnore?: () => void;
  onCoverClick?: () => void;
  onVote?: (bookId: string, vote: VoteType) => void;
  onGenreClick?: (genre: string) => void;
  selectedBookId?: string | null;
  isCompleted?: boolean; // Whether the selected book is marked as completed
  continuousSpin?: boolean; // When true, spin indefinitely until released
  spinSpeedMultiplier?: number; // Speed modifier (1.0 = normal, 0.5 = 2x faster)
  hasGoldenBorder?: boolean; // Shows golden border effect (completionist achievement)
}

export function Carousel({
  books: booksProp,
  seriesMap,
  userWishlist,
  userVotes,
  onBookSelected,
  triggerSpin,
  onSpinStart,
  onWishlist,
  onCompleted,
  onSpinAgain,
  onIgnore,
  onCoverClick,
  onVote,
  onGenreClick,
  selectedBookId,
  isCompleted = false,
  continuousSpin = false,
  spinSpeedMultiplier = 1.0,
  hasGoldenBorder = false,
}: CarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [injectedBooks, setInjectedBooks] = useState<{ index: number; book: Book }[]>([]);
  const { selectBook, getTargetIndex } = useWeightedSelection();

  // Create books array with any swapped books applied
  const books = useMemo(() => {
    // injectedBooks is a map of index -> replacement book
    if (injectedBooks.length === 0) return booksProp;

    const result = [...booksProp];
    for (const { index, book } of injectedBooks) {
      if (index >= 0 && index < result.length) {
        result[index] = book;
      }
    }
    return result;
  }, [booksProp, injectedBooks]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(viewportRef);

  // Track previous booksProp to detect filter changes
  const prevBooksPropRef = useRef<Book[] | null>(null);

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

  const { angle, spinState, startSpin, startContinuousSpin, stopAndLand, nudge } = useCarouselSpin({
    itemCount: books.length,
    spinDuration: 4000,
    spinSpeedMultiplier,
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

  // Keep a ref to doLand to avoid stale closures in effects
  const doLandRef = useRef(doLand);
  useEffect(() => {
    doLandRef.current = doLand;
  }, [doLand]);

  // Swipe tracking for touch gestures
  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50; // minimum pixels to count as a swipe

  // Helper to chain multiple nudges for non-adjacent card clicks
  const nudgeMultiple = useCallback(
    (direction: 'left' | 'right', steps: number) => {
      if (steps <= 0) return;

      const doNextNudge = (remaining: number) => {
        if (remaining <= 0) return;
        nudge(direction, () => {
          if (remaining > 1) {
            doNextNudge(remaining - 1);
          }
        });
      };

      doNextNudge(steps);
    },
    [nudge]
  );

  // Handle clicking on a non-selected card - use nudge instead of full spin
  const handleCardClick = useCallback(
    (index: number) => {
      if (spinState === 'spinning' || spinState === 'continuous' || spinState === 'nudging') return;
      if (selectedIndex === null) return;

      // Calculate shortest path (accounting for wrap-around)
      let diff = index - selectedIndex;
      const halfLength = books.length / 2;

      // Take the shorter path around the wheel
      if (diff > halfLength) diff -= books.length;
      else if (diff < -halfLength) diff += books.length;

      if (diff === 0) return; // Already selected

      const direction = diff > 0 ? 'left' : 'right';
      const steps = Math.abs(diff);

      nudgeMultiple(direction, steps);
    },
    [spinState, selectedIndex, books.length, nudgeMultiple]
  );

  // Handle clicking a book from the series modal - swap current book for the selected one
  const handleSeriesBookClick = useCallback(
    (targetBook: Book) => {
      if (spinState === 'spinning' || spinState === 'continuous' || spinState === 'nudging') return;
      if (selectedIndex === null) return;

      // If clicking the current book, do nothing
      if (books[selectedIndex]?.id === targetBook.id) return;

      // Swap the book at the current position
      setInjectedBooks(prev => {
        // Remove any existing swap at this index, then add the new one
        const filtered = prev.filter(item => item.index !== selectedIndex);
        return [...filtered, { index: selectedIndex, book: targetBook }];
      });

      // Update the selected book
      onBookSelected(targetBook);
    },
    [spinState, books, selectedIndex, onBookSelected]
  );

  // Keyboard navigation - arrow keys to nudge left/right
  useEffect(() => {
    if (spinState !== 'stopped') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudge('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudge('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spinState, nudge]);

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (touchStartX.current === null || spinState !== 'stopped') {
        touchStartX.current = null;
        return;
      }

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        // Swipe right (positive deltaX) = show previous card = nudge left
        // Swipe left (negative deltaX) = show next card = nudge right
        nudge(deltaX > 0 ? 'left' : 'right');
      }
      touchStartX.current = null;
    },
    [spinState, nudge]
  );

  // Start continuous spin on mount if continuousSpin is true
  useEffect(() => {
    if (books.length > 0 && continuousSpin && spinState === 'idle') {
      startContinuousSpin();
    }
  }, [books.length, continuousSpin, spinState, startContinuousSpin]);

  // Handle transition from continuous spin to landing
  useEffect(() => {
    if (!continuousSpin && spinState === 'continuous') {
      doLandRef.current();
    }
  }, [continuousSpin, spinState]);

  // Auto-spin on mount (only if not in continuous mode)
  useEffect(() => {
    if (books.length > 0 && spinState === 'idle' && !continuousSpin) {
      const timer = setTimeout(doSpin, 500);
      return () => clearTimeout(timer);
    }
  }, [books.length, continuousSpin, spinState, doSpin]);

  // Handle external spin trigger
  useEffect(() => {
    if (triggerSpin && spinState === 'stopped') {
      doSpin();
    }
  }, [triggerSpin]);

  // When the base books list changes (e.g., due to filter), clear series swaps
  // BUT preserve the injection for the currently selected book (if any)
  // This prevents the selected book from disappearing when clicking a genre tag
  useEffect(() => {
    setInjectedBooks(prev => prev.filter(({ book }) => book.id === selectedBookId));
  }, [booksProp, selectedBookId]);

  // When books change due to filtering, spin to a new book from the filtered set
  // This ensures clicking a genre tag gives a fresh recommendation
  useEffect(() => {
    // Skip the initial render
    if (prevBooksPropRef.current === null) {
      prevBooksPropRef.current = booksProp;
      return;
    }

    // Skip if booksProp reference hasn't changed
    if (prevBooksPropRef.current === booksProp) return;

    // Update ref
    prevBooksPropRef.current = booksProp;

    // Skip if not stopped or no books
    if (spinState !== 'stopped' || books.length === 0) return;

    // Re-spin to get a fresh book from the filtered set
    doSpin();
  }, [booksProp, spinState, books.length, doSpin]);

  const isInWishlist = selectedBookId ? userWishlist.includes(selectedBookId) : false;
  const showActions = spinState === 'stopped' && selectedIndex !== null;
  const hasBooks = books.length > 0;

  const containerClasses = [styles.container, hasGoldenBorder && styles.goldenBorder]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dark overlay when stopped to dim background cards */}
        {showActions && <div className={styles.overlay} />}

        {hasBooks ? (
          <CarouselTrack
            books={books}
            angle={angle}
            selectedIndex={selectedIndex}
            spinning={spinState === 'spinning' || spinState === 'continuous' || spinState === 'nudging'}
            userWishlist={userWishlist}
            userVotes={userVotes}
            seriesMap={seriesMap}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onCoverClick={onCoverClick}
            onCardClick={handleCardClick}
            onVote={onVote}
            onSeriesBookClick={handleSeriesBookClick}
            onGenreClick={onGenreClick}
          />
        ) : (
          <div className={styles.empty}>No books available</div>
        )}
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
            onClick={onCompleted}
            disabled={isCompleted}
            type="button"
          >
            {isCompleted ? 'Completed ✓' : 'Mark Complete'}
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
            Hide this Book
          </button>
        </div>
      )}
    </div>
  );
}
