import { useMemo, useEffect, useRef } from 'react';
import type { Book } from '../../types/book';
import { BookCard } from './BookCard';
import styles from './Carousel.module.css';

// Debug: Track position over time
const DEBUG_CARD_INDEX = 0; // Track the first card
const debugLog: Array<{ time: number; angle: number; x: number; y: number; scale: number; opacity: number }> = [];

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { debugLog: typeof debugLog }).debugLog = debugLog;
}

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
const WHEEL_CENTER_X_VH = -50;
const WHEEL_CENTER_Y_VH = -20;

// Selection point - where the "featured" card sits (in degrees)
// At ~40 degrees with the wheel center upper-left, the card lands in center-right of viewport
const SELECTION_ANGLE = 40;

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
  const startTimeRef = useRef<number | null>(null);
  const lastSpinningRef = useRef(spinning);

  const vh = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight / 100;
    }
    return 10;
  }, []);

  // Debug: Reset log when spin starts
  useEffect(() => {
    if (spinning && !lastSpinningRef.current) {
      // Spin just started
      debugLog.length = 0;
      startTimeRef.current = performance.now();
      console.log('=== SPIN STARTED ===');
    } else if (!spinning && lastSpinningRef.current) {
      // Spin just ended
      console.log('=== SPIN ENDED ===');
      console.log('Debug log entries:', debugLog.length);
      console.table(debugLog.slice(-20)); // Show last 20 entries
    }
    lastSpinningRef.current = spinning;
  }, [spinning]);

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
        const isAtSelection = distFromSelection < 20;

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

        const isVisible = opacity > 0;

        // Debug: Log position for tracked card
        if (index === DEBUG_CARD_INDEX && spinning && startTimeRef.current) {
          const elapsed = performance.now() - startTimeRef.current;
          debugLog.push({
            time: Math.round(elapsed),
            rawAngle: Math.round(cardAngle * 10) / 10,  // The actual angle from props
            effectiveAngle: Math.round(effectiveAngle * 10) / 10,
            x: Math.round(x),
            y: Math.round(y),
            scale: Math.round(scale * 100) / 100,
            opacity: Math.round(opacity * 100) / 100,
          });
        }

        // For large card, position in center of screen instead of on the arc
        const largeCardX = 0;  // Center horizontally (track is already at 50% left)
        const largeCardY = 0;  // Center vertically (track is already at 50% top)

        // Debug overlay for tracked card
        const showDebug = index === DEBUG_CARD_INDEX;

        return (
          <div
            key={book.id}
            className={`${styles.cardWrapper} ${showLarge ? styles.cardWrapperLarge : ''}`}
            style={{
              transform: showLarge
                ? `translate(${largeCardX}px, ${largeCardY}px)`
                : `translate(${x}px, ${y}px) scale(${scale})`,
              opacity: showLarge ? 1 : opacity,
              zIndex: showLarge ? 200 : isSelected ? 100 : Math.round(50 - distFromSelection),
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
            {/* Debug overlay */}
            {showDebug && !showLarge && (
              <div style={{
                position: 'absolute',
                top: -60,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 0, 0, 0.9)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                zIndex: 9999,
              }}>
                <div>x: {Math.round(x)} y: {Math.round(y)}</div>
                <div>angle: {Math.round(effectiveAngle)}° scale: {scale.toFixed(2)}</div>
                <div>opacity: {opacity.toFixed(2)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
