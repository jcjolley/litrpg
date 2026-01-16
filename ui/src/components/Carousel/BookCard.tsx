import { useState, useRef, useCallback, useEffect } from 'react';
import type { Book } from '../../types/book';
import type { VoteType } from '../../hooks/useVotes';
import { SeriesTooltip } from '../SeriesTooltip';
import { seriesHasMultipleBooks } from '../../utils/seriesGrouping';
import styles from './Carousel.module.css';

interface BookCardProps {
  book: Book;
  isSelected?: boolean;
  isInteractive?: boolean;  // Can click card to go to Audible
  isWishlisted?: boolean;
  userVote?: VoteType | null;  // User's current vote on this book
  seriesMap?: Map<string, Book[]>;  // Map of series to books for tooltip
  onCardClick?: () => void;
  onVote?: (vote: VoteType) => void;
  onSeriesBookClick?: (book: Book) => void;  // Navigate to another book in series
  onGenreClick?: (genre: string) => void;  // Filter by this genre
}

export function BookCard({
  book,
  isSelected = false,
  isInteractive = false,
  isWishlisted = false,
  userVote = null,
  seriesMap,
  onCardClick,
  onVote,
  onSeriesBookClick,
  onGenreClick,
}: BookCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleVoteClick = (e: React.MouseEvent, vote: VoteType) => {
    e.stopPropagation(); // Prevent card click
    onVote?.(vote);
  };

  const handleGenreClick = (e: React.MouseEvent, genre: string) => {
    e.stopPropagation(); // Prevent card click
    onGenreClick?.(genre);
  };

  // Check if this book has multiple books in its series
  const hasMultipleBooksInSeries = seriesMap
    ? seriesHasMultipleBooks(seriesMap, book)
    : false;

  // Get series books for tooltip
  const seriesBooks = hasMultipleBooksInSeries && book.series && seriesMap
    ? seriesMap.get(book.series.toLowerCase().trim()) || []
    : [];

  // Handle hover on series name (desktop)
  const handleSeriesMouseEnter = useCallback(() => {
    if (!hasMultipleBooksInSeries) return;
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(true);
    }, 150);
  }, [hasMultipleBooksInSeries]);

  const handleSeriesMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Don't close immediately - let tooltip's own mouse handling take over
  }, []);

  // Handle tap on series name (mobile)
  const handleSeriesClick = useCallback((e: React.MouseEvent) => {
    if (!hasMultipleBooksInSeries) return;
    e.stopPropagation(); // Prevent card click
    e.preventDefault(); // Prevent any default behavior
    setShowTooltip((prev) => !prev);
  }, [hasMultipleBooksInSeries]);

  // Handle pointer down to mark that we're interacting with the series link
  // This prevents the parent wrapper's click from firing on mobile
  const handleSeriesPointerDown = useCallback((e: React.PointerEvent) => {
    if (!hasMultipleBooksInSeries) return;
    e.stopPropagation(); // Stop the event from reaching the wrapper
  }, [hasMultipleBooksInSeries]);

  // Handle clicking a book in the tooltip
  const handleTooltipBookClick = useCallback((selectedBook: Book) => {
    setShowTooltip(false);
    onSeriesBookClick?.(selectedBook);
  }, [onSeriesBookClick]);

  // Close tooltip handler
  const handleTooltipClose = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
          <div className={styles.cardLargeSeriesContainer}>
            <p className={styles.cardLargeSeries}>
              <span
                className={hasMultipleBooksInSeries ? styles.seriesLink : undefined}
                onMouseEnter={handleSeriesMouseEnter}
                onMouseLeave={handleSeriesMouseLeave}
                onClick={handleSeriesClick}
                onPointerDown={handleSeriesPointerDown}
                role={hasMultipleBooksInSeries ? 'button' : undefined}
                tabIndex={hasMultipleBooksInSeries ? 0 : undefined}
                data-interactive={hasMultipleBooksInSeries ? true : undefined}
              >
                {book.series}
              </span>
              {book.seriesPosition && ` - Book ${book.seriesPosition}`}
            </p>
            {showTooltip && hasMultipleBooksInSeries && (
              <SeriesTooltip
                seriesName={book.series}
                books={seriesBooks}
                currentBookId={book.id}
                onBookClick={handleTooltipBookClick}
                onClose={handleTooltipClose}
              />
            )}
          </div>
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

        {book.genres.length > 0 && (
          <p className={styles.cardLargeGenres}>
            {book.genres.map((genre, index) => (
              <span key={genre}>
                {index > 0 && ' • '}
                <span
                  className={onGenreClick ? styles.genreLink : undefined}
                  onClick={onGenreClick ? (e) => handleGenreClick(e, genre) : undefined}
                  role={onGenreClick ? 'button' : undefined}
                  tabIndex={onGenreClick ? 0 : undefined}
                  data-interactive={onGenreClick ? true : undefined}
                >
                  {genre}
                </span>
              </span>
            ))}
          </p>
        )}

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

  // Handle card click - but not if clicking on interactive elements inside
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger card click if clicking on interactive elements (like series link)
    if (target.closest('[data-interactive]')) {
      return;
    }
    onCardClick?.();
  }, [onCardClick]);

  return (
    <div
      className={`${styles.cardLarge} ${isSelected ? styles.cardLargeSelected : ''} ${isClickable ? styles.cardLargeClickable : ''}`}
      onClick={isClickable ? handleCardClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {cardContent}
    </div>
  );
}
