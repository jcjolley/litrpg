import { useState, useEffect } from 'react';
import type { Book } from '../../types/book';
import { BookCard } from './BookCard';
import styles from './Carousel.module.css';

interface CarouselTrackProps {
  books: Book[];
  angle: number;
  selectedIndex: number | null;
  spinning: boolean;
  onCoverClick?: () => void;
  onCardClick?: (index: number) => void;
}

// Selection point - where the "featured" card sits (in degrees)
const SELECTION_ANGLE = 40;
const SELECTION_RADIANS = (SELECTION_ANGLE * Math.PI) / 180;

// Scale range
const MIN_SCALE = 0.28;
const MAX_SCALE = 1.0;

// Breakpoint for mobile
const MOBILE_BREAKPOINT = 768;

function useResponsiveWheel() {
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, vh: 10, vw: 10 };
    }
    return {
      isMobile: window.innerWidth <= MOBILE_BREAKPOINT,
      vh: window.innerHeight / 100,
      vw: window.innerWidth / 100,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        isMobile: window.innerWidth <= MOBILE_BREAKPOINT,
        vh: window.innerHeight / 100,
        vw: window.innerWidth / 100,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}

export function CarouselTrack({
  books,
  angle,
  selectedIndex,
  spinning,
  onCoverClick,
  onCardClick,
}: CarouselTrackProps) {
  const anglePerItem = 360 / books.length;
  const { isMobile, vh } = useResponsiveWheel();

  // Wheel radius adapts to screen size - smaller on mobile
  const wheelRadiusVh = isMobile ? 55 : 80;
  const wheelRadius = wheelRadiusVh * vh;

  // Position wheel center so that a card at SELECTION_ANGLE lands at viewport center
  const wheelCenterX = -wheelRadiusVh * Math.cos(SELECTION_RADIANS) * vh;
  const wheelCenterY = -wheelRadiusVh * Math.sin(SELECTION_RADIANS) * vh;

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
              // Dim non-selected cards when stopped with a selection
              opacity: !spinning && selectedIndex !== null && !isAtCenter ? opacity * 0.3 : opacity,
              zIndex: isAtCenter ? 200 : isSelected ? 100 : Math.round(50 - distFromSelection),
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
              onCardClick={isAtCenter ? onCoverClick : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
