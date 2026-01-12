import type { Book } from '../../types/book';
import styles from './Carousel.module.css';

interface BookCardProps {
  book: Book;
  isSelected?: boolean;
  isInteractive?: boolean;  // Can click card to go to Audible
  onCardClick?: () => void;
}

export function BookCard({
  book,
  isSelected = false,
  isInteractive = false,
  onCardClick,
}: BookCardProps) {
  const cardContent = (
    <div className={styles.cardLargeBody}>
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

        {isInteractive && (
          <span className={styles.cardLargeHint}>Click to view on Audible</span>
        )}
      </div>
    </div>
  );

  // When interactive, make the entire card clickable
  if (isInteractive && onCardClick) {
    return (
      <button
        className={`${styles.cardLarge} ${styles.cardLargeSelected} ${styles.cardLargeClickable}`}
        onClick={onCardClick}
        type="button"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className={`${styles.cardLarge} ${isSelected ? styles.cardLargeSelected : ''}`}>
      {cardContent}
    </div>
  );
}
