import { useMemo } from 'react';
import { useAchievementEffects } from '../../hooks/useAchievementEffects';
import { getAffiliateUrl } from '../../config';
import type { Book } from '../../types/book';
import styles from './WishlistPanel.module.css';

interface WishlistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  books: Book[];
  onRemove: (bookId: string) => void;
  unlockedAchievements: string[];
}

export function WishlistPanel({
  isOpen,
  onClose,
  wishlistIds,
  books,
  onRemove,
  unlockedAchievements,
}: WishlistPanelProps) {
  const effects = useAchievementEffects(unlockedAchievements);

  // Get full book data for wishlisted items
  const wishlistedBooks = useMemo(() => {
    return wishlistIds
      .map((id) => books.find((b) => b.id === id))
      .filter((b): b is Book => b !== undefined);
  }, [wishlistIds, books]);

  const handleExport = () => {
    const exportData = wishlistedBooks.map((book) => ({
      title: book.title,
      author: book.author,
      url: book.audibleUrl,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'litrpg-wishlist.json';
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <h2 className={styles.title}>WISHLIST</h2>
          <span className={styles.count}>[{wishlistIds.length}]</span>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Book List */}
        <div className={styles.bookList}>
          {wishlistedBooks.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>&#128218;</span>
              <p className={styles.emptyText}>No books wishlisted yet</p>
              <p className={styles.emptyHint}>Spin the carousel and wishlist books you like!</p>
            </div>
          ) : (
            wishlistedBooks.map((book) => (
              <div key={book.id} className={styles.bookRow}>
                <div className={styles.bookInfo}>
                  <span
                    className={styles.bookTitle}
                    onClick={() => handleBookClick(book)}
                  >
                    {book.title}
                  </span>
                  <span className={styles.bookAuthor}>{book.author}</span>
                </div>
                <button
                  className={styles.removeButton}
                  onClick={() => onRemove(book.id)}
                  type="button"
                  title="Remove from wishlist"
                >
                  &#10005;
                </button>
              </div>
            ))
          )}
        </div>

        {/* Export Section */}
        {wishlistedBooks.length > 0 && (
          <div className={styles.exportSection}>
            {effects.hasExportWishlist ? (
              <button className={styles.exportButton} onClick={handleExport} type="button">
                EXPORT WISHLIST
              </button>
            ) : (
              <div className={styles.exportLocked}>
                <span className={styles.lockIcon}>&#128274;</span>
                <span>Wishlist a book to unlock export</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
