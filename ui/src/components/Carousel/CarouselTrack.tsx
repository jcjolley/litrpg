import { useMemo } from 'react';
import type { Book } from '../../types/book';
import { BookCard } from './BookCard';
import styles from './Carousel.module.css';

interface CarouselTrackProps {
  books: Book[];
  angle: number;
  selectedIndex: number | null;
  spinning: boolean;
  onWishlist?: () => void;
  onSpinAgain?: () => void;
  onIgnore?: () => void;
  onCoverClick?: () => void;
  isInWishlist?: boolean;
}

// Wheel configuration as percentages of viewport height
const WHEEL_RADIUS_VH = 80;

// Selection point - where the "featured" card sits (in degrees)
const SELECTION_ANGLE = 40;

// Position wheel center so that a card at SELECTION_ANGLE lands at viewport center
// Using: centerX = -radius * cos(angle), centerY = -radius * sin(angle)
const SELECTION_RADIANS = (SELECTION_ANGLE * Math.PI) / 180;
const WHEEL_CENTER_X_VH = -WHEEL_RADIUS_VH * Math.cos(SELECTION_RADIANS);
const WHEEL_CENTER_Y_VH = -WHEEL_RADIUS_VH * Math.sin(SELECTION_RADIANS);

export function CarouselTrack({
  books,
  angle,
  selectedIndex,
  spinning,
  onWishlist,
  onSpinAgain,
  onIgnore,
  onCoverClick,
  isInWishlist,
}: CarouselTrackProps) {
  const anglePerItem = 360 / books.length;

  const vh = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight / 100;
    }
    return 10;
  }, []);

  const wheelRadius = WHEEL_RADIUS_VH * vh;
  const wheelCenterX = WHEEL_CENTER_X_VH * vh;
  const wheelCenterY = WHEEL_CENTER_Y_VH * vh;

  return (
    <div className={styles.track}>
      {books.map((book, index) => {
        const cardAngle = angle + index * anglePerItem;
        const radians = (cardAngle * Math.PI) / 180;

        const x = wheelCenterX + wheelRadius * Math.cos(radians);
        const y = wheelCenterY + wheelRadius * Math.sin(radians);

        // Normalize angle
        const normalizedAngle = ((cardAngle % 360) + 360) % 360;

        // Fade in/out - cards visible from -20 to 120 degrees
        const FADE_IN_START = -20;
        const FADE_IN_END = 10;
        const FADE_OUT_START = 90;
        const FADE_OUT_END = 120;

        let opacity = 0;
        // Handle wrap-around near 360/0 boundary
        let effectiveAngle = normalizedAngle;
        if (normalizedAngle > 300) {
          effectiveAngle = normalizedAngle - 360;
        }

        if (effectiveAngle >= FADE_IN_START && effectiveAngle < FADE_IN_END) {
          opacity = (effectiveAngle - FADE_IN_START) / (FADE_IN_END - FADE_IN_START);
        } else if (effectiveAngle >= FADE_IN_END && effectiveAngle <= FADE_OUT_START) {
          opacity = 1;
        } else if (effectiveAngle > FADE_OUT_START && effectiveAngle <= FADE_OUT_END) {
          opacity = 1 - (effectiveAngle - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START);
        }
        opacity = Math.max(0, Math.min(1, opacity));

        // Scale - grow large at selection point
        // Handle wrap-around for distance calculation
        let distFromSelection = Math.abs(effectiveAngle - SELECTION_ANGLE);
        if (distFromSelection > 180) distFromSelection = 360 - distFromSelection;

        const isSelected = selectedIndex !== null && index === selectedIndex;

        // When stopped and selected, show large card; otherwise scale based on position
        const showLarge = !spinning && isSelected;

        let scale: number;
        if (showLarge) {
          scale = 1; // Large card has its own size
        } else {
          // Bigger base scale, larger max scale for more visible cards
          const MIN_SCALE = 0.5;
          const MAX_SCALE = 1.5;
          const scaleProgress = Math.max(0, 1 - distFromSelection / 50);
          scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * Math.pow(scaleProgress, 1.2);
        }

        return (
          <div
            key={book.id}
            className={`${styles.cardWrapper} ${showLarge ? styles.cardWrapperLarge : ''}`}
            style={showLarge ? undefined : {
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              opacity: opacity,
              zIndex: isSelected ? 100 : Math.round(50 - distFromSelection),
            }}
          >
            <BookCard
              book={book}
              isSelected={isSelected}
              isLarge={showLarge}
              onWishlist={showLarge ? onWishlist : undefined}
              onSpinAgain={showLarge ? onSpinAgain : undefined}
              onIgnore={showLarge ? onIgnore : undefined}
              onCoverClick={showLarge ? onCoverClick : undefined}
              isInWishlist={isInWishlist}
            />
          </div>
        );
      })}
    </div>
  );
}
