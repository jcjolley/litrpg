import type { Book } from '../../types/book';
import styles from './Carousel.module.css';

interface BookCardProps {
  book: Book;
  isSelected?: boolean;
  isInteractive?: boolean;  // Can click card to go to Audible
  isWishlisted?: boolean;
  onCardClick?: () => void;
}

export function BookCard({
  book,
  isSelected = false,
  isInteractive = false,
  isWishlisted = false,
  onCardClick,
}: BookCardProps) {
  const cardContent = (
    <div className={styles.cardLargeBody}>
      {/* Wishlist indicator */}
      {isWishlisted && (
        <div className={styles.wishlistBadge} title="In your wishlist">
          &#9829;
        </div>
      )}

      {/* Book info */}
      <div className={styles.cardLargeContent}>
        <h2 className={styles.cardLargeTitle}>{book.title}</h2>

        {book.subtitle && (
          <p className={styles.cardLargeSubtitle}>{book.subtitle}</p>
        )}

        <p className={styles.cardLargeAuthor}>by {book.author}</p>

        {book.narrator && (
          <p className={styles.cardLargeNarrator}>narrated by {book.narrator}</p>
        )}

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

        <div
          className={styles.cardLargeHint}
          style={{ visibility: isInteractive ? 'visible' : 'hidden' }}
        >
          <span>View on Audible</span>
          <span className={styles.cardLargeHintSubtitle}>(Affiliate Link)</span>
        </div>
      </div>
    </div>
  );

  const isClickable = isInteractive && onCardClick;

  return (
    <div
      className={`${styles.cardLarge} ${isSelected ? styles.cardLargeSelected : ''} ${isClickable ? styles.cardLargeClickable : ''}`}
      onClick={isClickable ? onCardClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {cardContent}
    </div>
  );
}
