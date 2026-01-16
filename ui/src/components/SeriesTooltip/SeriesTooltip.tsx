import { useEffect, useRef } from 'react';
import type { Book } from '../../types/book';
import styles from './SeriesTooltip.module.css';

interface SeriesTooltipProps {
  /** The series name to display as header */
  seriesName: string;
  /** All books in this series, sorted by position */
  books: Book[];
  /** ID of the currently displayed book (to highlight) */
  currentBookId: string;
  /** Called when user clicks on a book in the list */
  onBookClick: (book: Book) => void;
  /** Called when tooltip should close (click outside, escape key) */
  onClose: () => void;
}

export function SeriesTooltip({
  seriesName,
  books,
  currentBookId,
  onBookClick,
  onClose,
}: SeriesTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediately closing from the triggering click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  const handleBookClick = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    onBookClick(book);
  };

  return (
    <div ref={tooltipRef} className={styles.tooltip} role="menu">
      <div className={styles.arrow} />
      <div className={styles.header}>{seriesName}</div>
      <ul className={styles.bookList}>
        {books.map((book) => {
          const isCurrent = book.id === currentBookId;
          const positionLabel = book.seriesPosition
            ? `Book ${book.seriesPosition}`
            : 'Book';

          return (
            <li key={book.id}>
              <button
                className={`${styles.bookItem} ${isCurrent ? styles.bookItemCurrent : ''}`}
                onClick={(e) => handleBookClick(e, book)}
                type="button"
                role="menuitem"
              >
                <span className={styles.bookPosition}>{positionLabel}:</span>
                <span className={styles.bookTitle}>{book.title}</span>
                {isCurrent && <span className={styles.currentIndicator}>&#10003;</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
