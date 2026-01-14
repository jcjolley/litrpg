import type { Book } from '../../types/book';
import type { VoteType } from '../../hooks/useVotes';
import { BookCard } from './BookCard';
import styles from './Carousel.module.css';

interface CarouselTrackProps {
  books: Book[];
  angle: number;
  selectedIndex: number | null;
  spinning: boolean;
  userWishlist: string[];
  userVotes: { [bookId: string]: VoteType };
  containerWidth: number;
  containerHeight: number;
  onCoverClick?: () => void;
  onCardClick?: (index: number) => void;
  onVote?: (bookId: string, vote: VoteType) => void;
}

// Selection point - where the "featured" card sits (in degrees)
const SELECTION_ANGLE = 40;
const SELECTION_RADIANS = (SELECTION_ANGLE * Math.PI) / 180;

// Scale range
const MIN_SCALE = 0.28;
const MAX_SCALE = 1.0;

// Visibility range - cards visible from -20 to 120 degrees
const VISIBLE_START = -20;
const VISIBLE_END = 120;
// Buffer for smooth transitions during spin
const VISIBILITY_BUFFER = 30;

// Helper to get effective angle (handles wrap-around)
function getEffectiveAngle(normalizedAngle: number): number {
  return normalizedAngle > 300 ? normalizedAngle - 360 : normalizedAngle;
}

// Check if a card should be rendered based on its angle
function isCardVisible(cardAngle: number): boolean {
  const normalizedAngle = ((cardAngle % 360) + 360) % 360;
  const effectiveAngle = getEffectiveAngle(normalizedAngle);
  return effectiveAngle >= VISIBLE_START - VISIBILITY_BUFFER &&
         effectiveAngle <= VISIBLE_END + VISIBILITY_BUFFER;
}

export function CarouselTrack({
  books,
  angle,
  selectedIndex,
  spinning,
  userWishlist,
  userVotes,
  containerWidth,
  containerHeight,
  onCoverClick,
  onCardClick,
  onVote,
}: CarouselTrackProps) {
  const anglePerItem = 360 / books.length;

  // Calculate wheel radius based on container size (smaller dimension determines radius)
  // Use a percentage of the container to ensure the wheel fits
  const containerMin = Math.min(containerWidth, containerHeight);
  const wheelRadius = containerMin * 0.7; // 70% of smaller dimension

  // Position wheel center so that a card at SELECTION_ANGLE lands at container center
  const wheelCenterX = -wheelRadius * Math.cos(SELECTION_RADIANS);
  const wheelCenterY = -wheelRadius * Math.sin(SELECTION_RADIANS);

  // Pre-filter to only render visible cards (plus buffer for transitions)
  const visibleCards = books
    .map((book, index) => ({ book, index, cardAngle: angle + index * anglePerItem }))
    .filter(({ cardAngle }) => isCardVisible(cardAngle));

  return (
    <div className={styles.track}>
      {visibleCards.map(({ book, index, cardAngle }) => {
        const radians = (cardAngle * Math.PI) / 180;

        const x = wheelCenterX + wheelRadius * Math.cos(radians);
        const y = wheelCenterY + wheelRadius * Math.sin(radians);

        // Normalize angle
        const normalizedAngle = ((cardAngle % 360) + 360) % 360;
        const effectiveAngle = getEffectiveAngle(normalizedAngle);

        // Fade in/out constants
        const FADE_IN_START = -20;
        const FADE_IN_END = 10;
        const FADE_OUT_START = 90;
        const FADE_OUT_END = 120;

        let opacity = 0;
        if (effectiveAngle >= FADE_IN_START && effectiveAngle < FADE_IN_END) {
          opacity = (effectiveAngle - FADE_IN_START) / (FADE_IN_END - FADE_IN_START);
        } else if (effectiveAngle >= FADE_IN_END && effectiveAngle <= FADE_OUT_START) {
          opacity = 1;
        } else if (effectiveAngle > FADE_OUT_START && effectiveAngle <= FADE_OUT_END) {
          opacity = 1 - (effectiveAngle - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START);
        }
        opacity = Math.max(0, Math.min(1, opacity));

        // Scale based on distance from selection point
        let distFromSelection = Math.abs(effectiveAngle - SELECTION_ANGLE);
        if (distFromSelection > 180) distFromSelection = 360 - distFromSelection;

        const isSelected = selectedIndex !== null && index === selectedIndex;
        const isAtCenter = !spinning && isSelected;

        // Smooth scale transition based on distance from selection
        // Cards grow as they approach the selection point
        const scaleProgress = Math.max(0, 1 - distFromSelection / 60);
        const scale = isAtCenter
          ? MAX_SCALE
          : MIN_SCALE + (MAX_SCALE - MIN_SCALE) * Math.pow(scaleProgress, 2);

        // Can click to select this card if visible, not spinning, and not already at center
        const canClick = opacity > 0 && !spinning && !isAtCenter;

        const handleCardClick = () => {
          if (canClick && onCardClick) {
            onCardClick(index);
          }
        };

        return (
          <div
            key={book.id}
            className={styles.cardWrapper}
            style={{
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              // Dim non-selected cards when stopped with a selection (0.7 keeps them visible but subdued)
              opacity: !spinning && selectedIndex !== null && !isAtCenter ? opacity * 0.7 : opacity,
              // z-index: selected card at 200 (above overlay at 100), spinning selected at 100, others based on distance
              // Cards closer to selection get higher z-index (max 50 at selection, min 1 at edges)
              zIndex: isAtCenter ? 200 : isSelected ? 100 : Math.max(1, Math.round(50 - distFromSelection)),
              transition: isAtCenter ? 'transform 0.3s ease-out, opacity 0.4s ease-out' : 'opacity 0.4s ease-out',
              cursor: canClick ? 'pointer' : undefined,
            }}
            onClick={handleCardClick}
            role={canClick ? 'button' : undefined}
            tabIndex={canClick ? 0 : undefined}
          >
            <BookCard
              book={book}
              isSelected={isSelected}
              isInteractive={isAtCenter}
              isWishlisted={userWishlist.includes(book.id)}
              userVote={userVotes[book.id] || null}
              onCardClick={isAtCenter ? onCoverClick : undefined}
              onVote={onVote ? (vote) => onVote(book.id, vote) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
