import type { Book } from '../../types/book';
import styles from './Carousel.module.css';

interface BookCardProps {
  book: Book;
  isSelected?: boolean;
  isLarge?: boolean;
  onWishlist?: () => void;
  onSpinAgain?: () => void;
  onIgnore?: () => void;
  onCoverClick?: () => void;
  isInWishlist?: boolean;
}

export function BookCard({
  book,
  isSelected = false,
  isLarge = false,
  onWishlist,
  onSpinAgain,
  onIgnore,
  onCoverClick,
  isInWishlist = false,
}: BookCardProps) {
  // Small card - just cover and title
  if (!isLarge) {
    return (
      <div className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}>
        <div className={styles.cardImageContainer}>
          <img
            src={book.imageUrl}
            alt={book.title}
            className={styles.cardImage}
            loading="lazy"
          />
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.cardTitle}>{book.title}</div>
        </div>
      </div>
    );
  }

  // Large card - full details matching the original dialog
  return (
    <div className={`${styles.cardLarge} ${isSelected ? styles.cardLargeSelected : ''}`}>
      {/* Header */}
      <div className={styles.cardLargeHeader}>
        <span>RECOMMENDATION</span>
      </div>

      <div className={styles.cardLargeBody}>
        {/* Cover image - clickable */}
        <button
          className={styles.cardLargeCover}
          onClick={onCoverClick}
          type="button"
        >
          <img
            src={book.imageUrl}
            alt={book.title}
            className={styles.cardLargeCoverImg}
          />
          <span className={styles.cardLargeCoverHint}>View on Audible</span>
        </button>

        {/* Book info */}
        <div className={styles.cardLargeContent}>
          <h2 className={styles.cardLargeTitle}>{book.title}</h2>

          {book.subtitle && (
            <p className={styles.cardLargeSubtitle}>{book.subtitle}</p>
          )}

          <p className={styles.cardLargeAuthor}>by {book.author}</p>

          {book.series && (
            <p className={styles.cardLargeSeries}>
              {book.series}
              {book.seriesPosition && ` - Book ${book.seriesPosition}`}
            </p>
          )}

          <div className={styles.cardLargeStats}>
            <span className={styles.cardLargeStat}>
              ★ {book.rating.toFixed(1)} ({book.numRatings.toLocaleString()})
            </span>
            <span className={styles.cardLargeStat}>
              ⏱ {book.length}
            </span>
          </div>

          <p className={styles.cardLargeDescription}>{book.description}</p>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.cardActions}>
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
    </div>
  );
}
