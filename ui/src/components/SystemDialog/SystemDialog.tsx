import type { Book } from '../../types/book';
import { DialogButton } from './DialogButton';
import styles from './SystemDialog.module.css';

interface SystemDialogProps {
  book: Book;
  isOpen: boolean;
  isInWishlist: boolean;
  onWishlist: () => void;
  onSpinAgain: () => void;
  onIgnore: () => void;
  onCoverClick: () => void;
}

export function SystemDialog({
  book,
  isOpen,
  isInWishlist,
  onWishlist,
  onSpinAgain,
  onIgnore,
  onCoverClick,
}: SystemDialogProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerText}>RECOMMENDATION</span>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Book cover - clickable */}
          <button className={styles.coverButton} onClick={onCoverClick}>
            <img
              src={book.imageUrl}
              alt={book.title}
              className={styles.cover}
            />
            <span className={styles.coverHint}>View on Audible</span>
          </button>

          {/* Book info */}
          <div className={styles.info}>
            <h2 className={styles.title}>{book.title}</h2>

            {book.subtitle && (
              <p className={styles.subtitle}>{book.subtitle}</p>
            )}

            <p className={styles.author}>by {book.author}</p>

            {book.narrator && (
              <p className={styles.narrator}>narrated by {book.narrator}</p>
            )}

            {book.series && (
              <p className={styles.series}>
                {book.series}
                {book.seriesPosition && ` - Book ${book.seriesPosition}`}
              </p>
            )}

            <div className={styles.stats}>
              <span className={styles.stat}>
                ★ {book.rating.toFixed(1)} ({book.numRatings.toLocaleString()})
              </span>
              <span className={styles.stat}>
                ⏱ {book.length}
              </span>
            </div>

            <p className={styles.description}>{book.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <DialogButton
            variant="primary"
            onClick={onWishlist}
            disabled={isInWishlist}
          >
            {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
          </DialogButton>
          <DialogButton variant="secondary" onClick={onSpinAgain}>
            Spin Again
          </DialogButton>
          <DialogButton variant="danger" onClick={onIgnore}>
            Not Interested
          </DialogButton>
        </div>
      </div>
    </div>
  );
}
