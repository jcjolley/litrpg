/**
 * Easing functions for smooth animations
 */

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Custom carousel easing - slow start, speeds up, then slows down at end
 * Creates that satisfying "wheel of fortune" feel
 */
export function carouselEase(t: number): number {
  // Sine ease-in-out: smooth, natural feel without lingering too long at extremes
  // More gentle than polynomial easing
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
