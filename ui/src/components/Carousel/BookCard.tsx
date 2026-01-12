import type { Book } from '../../types/book';
import styles from './Carousel.module.css';

interface BookCardProps {
  book: Book;
  isSelected?: boolean;
  isInteractive?: boolean;  // Can click cover to go to Audible
  onCoverClick?: () => void;
}

export function BookCard({
  book,
  isSelected = false,
  isInteractive = false,
  onCoverClick,
}: BookCardProps) {
  return (
    <div className={`${styles.cardLarge} ${isSelected ? styles.cardLargeSelected : ''}`}>
      <div className={styles.cardLargeBody}>
        {/* Cover image - clickable when interactive */}
        {isInteractive && onCoverClick ? (
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
        ) : (
          <div className={styles.cardLargeCover}>
            <img
              src={book.imageUrl}
              alt={book.title}
              className={styles.cardLargeCoverImg}
            />
          </div>
        )}

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
    </div>
  );
}
