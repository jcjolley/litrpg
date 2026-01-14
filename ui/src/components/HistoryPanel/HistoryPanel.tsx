import { useMemo, useState } from 'react';
import { getAffiliateUrl } from '../../config';
import type { Book } from '../../types/book';
import type { HistoryEntry } from '../../hooks/useHistory';
import type { CompletedEntry } from '../../hooks/useCompleted';
import styles from './HistoryPanel.module.css';

type TabType = 'seen' | 'completed';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  completed: CompletedEntry[];
  books: Book[];
  onClear: () => void;
  onClearCompleted?: () => void;
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
  completed,
  books,
  onClear,
  onClearCompleted,
}: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('seen');

  // Get full book data for history entries (Seen tab)
  const historyBooks = useMemo(() => {
    return history
      .map((entry) => ({
        book: books.find((b) => b.id === entry.bookId),
        viewedAt: entry.viewedAt,
      }))
      .filter((item): item is { book: Book; viewedAt: number } => item.book !== undefined);
  }, [history, books]);

  // Get full book data for completed entries (Completed tab)
  const completedBooks = useMemo(() => {
    return completed
      .map((entry) => ({
        book: books.find((b) => b.id === entry.bookId),
        completedAt: entry.completedAt,
      }))
      .filter((item): item is { book: Book; completedAt: number } => item.book !== undefined);
  }, [completed, books]);

  // Current items to display based on active tab
  const currentItems = activeTab === 'seen' ? historyBooks : completedBooks;
  const currentCount = activeTab === 'seen' ? history.length : completed.length;

  const handleBookClick = (book: Book) => {
    const url = book.source === 'ROYAL_ROAD'
      ? book.royalRoadUrl
      : getAffiliateUrl(book.audibleUrl ?? '');
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>JOURNAL</h2>
          <span className={styles.count}>[{currentCount}]</span>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === 'seen' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('seen')}
            type="button"
          >
            Seen ({history.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'completed' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('completed')}
            type="button"
          >
            Completed ({completed.length})
          </button>
        </div>

        {/* Book List */}
        <div className={styles.bookList}>
          {currentItems.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>&#128216;</span>
              <p className={styles.emptyText}>
                {activeTab === 'seen' ? 'No entries yet' : 'No completed books'}
              </p>
              <p className={styles.emptyHint}>
                {activeTab === 'seen'
                  ? 'Books you view will appear here!'
                  : 'Mark books as complete to track your reading!'}
              </p>
            </div>
          ) : (
            currentItems.map((item) => {
              const book = item.book;
              const timestamp = 'viewedAt' in item ? item.viewedAt : item.completedAt;
              return (
                <div key={`${book.id}-${timestamp}`} className={styles.bookRow}>
                  <div className={styles.bookInfo}>
                    <span
                      className={styles.bookTitle}
                      onClick={() => handleBookClick(book)}
                    >
                      {book.title}
                    </span>
                    <span className={styles.bookMeta}>
                      <span className={styles.bookAuthor}>{book.author}</span>
                      <span className={styles.viewedAt}>{formatTimeAgo(timestamp)}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clear Section */}
        {currentItems.length > 0 && (
          <div className={styles.clearSection}>
            <button
              className={styles.clearButton}
              onClick={activeTab === 'seen' ? onClear : onClearCompleted}
              type="button"
            >
              {activeTab === 'seen' ? 'CLEAR JOURNAL' : 'CLEAR COMPLETED'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
