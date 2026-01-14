import type { Book } from '../../types/book';
import type { VoteType } from '../../hooks/useVotes';
import styles from './Carousel.module.css';

interface BookCardProps {
  book: Book;
  isSelected?: boolean;
  isInteractive?: boolean;  // Can click card to go to Audible
  isWishlisted?: boolean;
  userVote?: VoteType | null;  // User's current vote on this book
  onCardClick?: () => void;
  onVote?: (vote: VoteType) => void;
}

export function BookCard({
  book,
  isSelected = false,
  isInteractive = false,
  isWishlisted = false,
  userVote = null,
  onCardClick,
  onVote,
}: BookCardProps) {
  const handleVoteClick = (e: React.MouseEvent, vote: VoteType) => {
    e.stopPropagation(); // Prevent card click
    onVote?.(vote);
  };

  // Calculate score with optimistic UI update based on user's vote
  const baseScore = book.upvoteCount - book.downvoteCount;
  const userVoteAdjustment = userVote === 'up' ? 1 : userVote === 'down' ? -1 : 0;
  const netScore = baseScore + userVoteAdjustment;
  const scoreDisplay = netScore >= 0 ? `+${netScore}` : `${netScore}`;

  const cardContent = (
    <div className={styles.cardLargeBody}>
      {/* Wishlist indicator */}
      {isWishlisted && (
        <div className={styles.wishlistBadge} title="In your wishlist">
          &#9829;
        </div>
      )}

      {/* Vote buttons - top right corner */}
      <div className={styles.voteButtonsCorner}>
        <button
          className={`${styles.voteButtonLarge} ${styles.voteUp} ${userVote === 'up' ? styles.voteActive : ''}`}
          onClick={(e) => handleVoteClick(e, 'up')}
          title="Upvote this book"
        >
          +1
        </button>
        <span className={`${styles.voteScore} ${netScore > 0 ? styles.voteScorePositive : netScore < 0 ? styles.voteScoreNegative : ''}`}>
          {scoreDisplay}
        </span>
        <button
          className={`${styles.voteButtonLarge} ${styles.voteDown} ${userVote === 'down' ? styles.voteActive : ''}`}
          onClick={(e) => handleVoteClick(e, 'down')}
          title="Downvote this book"
        >
          -1
        </button>
      </div>

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
            {book.source === 'ROYAL_ROAD'
              ? `📄 ${book.pageCount?.toLocaleString() ?? '?'} pages`
              : `⏱ ${book.length ?? 'N/A'}`}
          </span>
        </div>

        <p className={styles.cardLargeDescription}>{book.description}</p>

        <div
          className={styles.cardLargeHint}
          style={{ visibility: isInteractive ? 'visible' : 'hidden' }}
        >
          {book.source === 'ROYAL_ROAD' ? (
            <span>View on Royal Road</span>
          ) : (
            <>
              <span>View on Audible</span>
              <span className={styles.cardLargeHintSubtitle}>(Affiliate Link)</span>
            </>
          )}
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
