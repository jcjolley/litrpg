import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  /** Called when modal should close (click outside, escape key) */
  onClose: () => void;
}

export function SeriesTooltip({
  seriesName,
  books,
  currentBookId,
  onBookClick,
  onClose,
}: SeriesTooltipProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Close on click outside the modal content
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleBookClick = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    onBookClick(book);
  };

  // Render at document root via portal to escape stacking context issues
  return createPortal(
    <div className={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true" data-interactive>
      <div ref={modalRef} className={styles.modal} role="menu" data-interactive>
        <button
          className={styles.closeButton}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
          data-interactive
        >
          ×
        </button>
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
                  {isCurrent && <span className={styles.currentIndicator}>★</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className={styles.hint}>Click a book to view it in the carousel</div>
      </div>
    </div>,
    document.body
  );
}
