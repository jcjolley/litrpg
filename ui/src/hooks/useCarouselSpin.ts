import { useState, useCallback, useRef, useEffect } from 'react';
import { carouselEase } from '../utils/easing';

export type SpinState = 'idle' | 'spinning' | 'continuous' | 'stopped';

interface UseCarouselSpinOptions {
  itemCount: number;
  spinDuration?: number;
  spinSpeedMultiplier?: number; // 1.0 = normal, 0.5 = 2x faster (half duration)
  continuousSpeed?: number; // degrees per second for continuous spin
  onSpinComplete?: (targetIndex: number) => void;
}

interface UseCarouselSpinResult {
  angle: number;  // Current rotation angle in degrees
  spinState: SpinState;
  startSpin: (targetIndex: number) => void;
  startContinuousSpin: () => void;
  stopAndLand: (targetIndex: number) => void;
  reset: () => void;
}

export function useCarouselSpin({
  itemCount,
  spinDuration = 4000,
  spinSpeedMultiplier = 1.0,
  continuousSpeed = 30, // 30 degrees per second = 1 full rotation every 12 seconds
  onSpinComplete,
}: UseCarouselSpinOptions): UseCarouselSpinResult {
  // Apply speed multiplier to duration (lower multiplier = faster = shorter duration)
  const effectiveDuration = spinDuration * spinSpeedMultiplier;
  const [angle, setAngle] = useState(0);
  const [spinState, setSpinState] = useState<SpinState>('idle');

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startAngleRef = useRef<number>(0);
  const targetAngleRef = useRef<number>(0);
  const targetIndexRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const currentAngleRef = useRef<number>(0);

  // Keep currentAngleRef in sync with angle state
  useEffect(() => {
    currentAngleRef.current = angle;
  }, [angle]);

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

  // Start continuous spinning (no target, just keeps going)
  const startContinuousSpin = useCallback(() => {
    if (spinState === 'continuous') return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    lastFrameTimeRef.current = performance.now();
    setSpinState('continuous');

    const animateContinuous = (currentTime: number) => {
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000; // seconds
      lastFrameTimeRef.current = currentTime;

      const deltaAngle = continuousSpeed * deltaTime;
      const newAngle = currentAngleRef.current + deltaAngle;

      setAngle(newAngle);
      currentAngleRef.current = newAngle;

      animationRef.current = requestAnimationFrame(animateContinuous);
    };

    animationRef.current = requestAnimationFrame(animateContinuous);
  }, [spinState, continuousSpeed]);

  // Stop continuous spin and land on a target
  const stopAndLand = useCallback(
    (targetIndex: number) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Calculate target position for this index
      const baseTargetAngle = getAngleForIndex(targetIndex);
      const currentAngle = currentAngleRef.current;

      // Ensure we spin forward by at least 270-320 degrees before landing
      const minRotation = 270 + Math.random() * 50;

      let targetAngle = baseTargetAngle;
      while (targetAngle < currentAngle + minRotation) {
        targetAngle += 360;
      }

      startAngleRef.current = currentAngle;
      targetAngleRef.current = targetAngle;
      targetIndexRef.current = targetIndex;
      startTimeRef.current = performance.now();

      setSpinState('spinning');

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / effectiveDuration, 1);
        const easedProgress = carouselEase(progress);

        const totalRotation = targetAngleRef.current - startAngleRef.current;
        const newAngle = startAngleRef.current + totalRotation * easedProgress;

        setAngle(newAngle);
        currentAngleRef.current = newAngle;

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setSpinState('stopped');
          onSpinComplete?.(targetIndexRef.current);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [getAngleForIndex, effectiveDuration, onSpinComplete]
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
        const progress = Math.min(elapsed / effectiveDuration, 1);
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
    [spinState, angle, getAngleForIndex, effectiveDuration, onSpinComplete]
  );

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setAngle(0);
    currentAngleRef.current = 0;
    setSpinState('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { angle, spinState, startSpin, startContinuousSpin, stopAndLand, reset };
}
