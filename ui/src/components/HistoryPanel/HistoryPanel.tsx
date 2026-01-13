import { useMemo } from 'react';
import { getAffiliateUrl } from '../../config';
import type { Book } from '../../types/book';
import type { HistoryEntry } from '../../hooks/useHistory';
import styles from './HistoryPanel.module.css';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  books: Book[];
  onClear: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function HistoryPanel({
  isOpen,
  onClose,
  history,
  books,
  onClear,
}: HistoryPanelProps) {
  // Get full book data for history entries
  const historyBooks = useMemo(() => {
    return history
      .map((entry) => ({
        book: books.find((b) => b.id === entry.bookId),
        viewedAt: entry.viewedAt,
      }))
      .filter((item): item is { book: Book; viewedAt: number } => item.book !== undefined);
  }, [history, books]);

  const handleBookClick = (book: Book) => {
    window.open(getAffiliateUrl(book.audibleUrl), '_blank');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>JOURNAL</h2>
          <span className={styles.count}>[{history.length}]</span>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Book List */}
        <div className={styles.bookList}>
          {historyBooks.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>&#128216;</span>
              <p className={styles.emptyText}>No entries yet</p>
              <p className={styles.emptyHint}>Books you view will appear here!</p>
            </div>
          ) : (
            historyBooks.map(({ book, viewedAt }) => (
              <div key={`${book.id}-${viewedAt}`} className={styles.bookRow}>
                <div className={styles.bookInfo}>
                  <span
                    className={styles.bookTitle}
                    onClick={() => handleBookClick(book)}
                  >
                    {book.title}
                  </span>
                  <span className={styles.bookMeta}>
                    <span className={styles.bookAuthor}>{book.author}</span>
                    <span className={styles.viewedAt}>{formatTimeAgo(viewedAt)}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clear Section */}
        {historyBooks.length > 0 && (
          <div className={styles.clearSection}>
            <button className={styles.clearButton} onClick={onClear} type="button">
              CLEAR JOURNAL
            </button>
          </div>
        )}
      </div>
    </>
  );
}
