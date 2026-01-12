import { useState, useCallback, useRef, useEffect } from 'react';
import { carouselEase } from '../utils/easing';

export type SpinState = 'idle' | 'spinning' | 'stopped';

interface UseCarouselSpinOptions {
  itemCount: number;
  spinDuration?: number;
  onSpinComplete?: (targetIndex: number) => void;
}

interface UseCarouselSpinResult {
  angle: number;  // Current rotation angle in degrees
  spinState: SpinState;
  startSpin: (targetIndex: number) => void;
  reset: () => void;
}

export function useCarouselSpin({
  itemCount,
  spinDuration = 4000,
  onSpinComplete,
}: UseCarouselSpinOptions): UseCarouselSpinResult {
  const [angle, setAngle] = useState(0);
  const [spinState, setSpinState] = useState<SpinState>('idle');

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startAngleRef = useRef<number>(0);
  const targetAngleRef = useRef<number>(0);
  const targetIndexRef = useRef<number>(0);

  // Angle per item (evenly distributed around the wheel)
  const anglePerItem = 360 / itemCount;

  // Calculate the angle needed to center a given index at the selection point
  const getAngleForIndex = useCallback(
    (index: number): number => {
      // Selection point is at 40 degrees (matches CarouselTrack SELECTION_ANGLE)
      // Adjust so the target card lands there
      const selectionAngle = 40;
      return selectionAngle - index * anglePerItem;
    },
    [anglePerItem]
  );

  const startSpin = useCallback(
    (targetIndex: number) => {
      if (spinState === 'spinning') return;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Calculate target position for this index
      const baseTargetAngle = getAngleForIndex(targetIndex);

      // Ensure we always spin forward (positive direction) by at least 270-320 degrees
      const minRotation = 270 + Math.random() * 50; // 270-320 degrees

      // Find the next occurrence of baseTargetAngle that's at least minRotation ahead
      let targetAngle = baseTargetAngle;
      while (targetAngle < angle + minRotation) {
        targetAngle += 360;
      }

      startAngleRef.current = angle;
      targetAngleRef.current = targetAngle;
      targetIndexRef.current = targetIndex;
      startTimeRef.current = performance.now();

      setSpinState('spinning');

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / spinDuration, 1);
        const easedProgress = carouselEase(progress);

        const totalRotation = targetAngleRef.current - startAngleRef.current;
        const currentAngle = startAngleRef.current + totalRotation * easedProgress;

        setAngle(currentAngle);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setSpinState('stopped');
          onSpinComplete?.(targetIndexRef.current);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [spinState, angle, getAngleForIndex, spinDuration, onSpinComplete]
  );

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setAngle(0);
    setSpinState('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { angle, spinState, startSpin, reset };
}
