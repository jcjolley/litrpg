import { useMemo } from 'react';
import { ACHIEVEMENTS } from './useAchievements';

const BASE_BOOK_LIMIT = 20;
const BASE_SPIN_SPEED = 1.0;

export interface AchievementEffects {
  bookLimit: number; // Base 20 + bonuses
  spinSpeedMultiplier: number; // 1.0 = normal, smaller = faster
  hasSurpriseMe: boolean;
  hasGoldenBorder: boolean;
  hasExportWishlist: boolean;
  hasSnarkyTooltips: boolean;
}

export function useAchievementEffects(unlockedAchievements: string[]): AchievementEffects {
  return useMemo(() => {
    // Calculate book limit bonus
    let bookBonus = 0;
    if (unlockedAchievements.includes('wishlist5')) {
      bookBonus += ACHIEVEMENTS.wishlist5.effectValue ?? 0;
    }
    if (unlockedAchievements.includes('wishlist10')) {
      bookBonus += ACHIEVEMENTS.wishlist10.effectValue ?? 0;
    }

    // Calculate spin speed multiplier (multiplicative)
    let spinSpeedMultiplier = BASE_SPIN_SPEED;
    if (unlockedAchievements.includes('picky')) {
      spinSpeedMultiplier *= ACHIEVEMENTS.picky.effectValue ?? 1;
    }
    if (unlockedAchievements.includes('speedReader')) {
      spinSpeedMultiplier *= ACHIEVEMENTS.speedReader.effectValue ?? 1;
    }

    // Feature flags
    const hasSurpriseMe = unlockedAchievements.includes('explorer');
    const hasGoldenBorder = unlockedAchievements.includes('completionist');
    const hasExportWishlist = unlockedAchievements.includes('firstWishlist');
    const hasSnarkyTooltips = unlockedAchievements.includes('contrarian');

    return {
      bookLimit: BASE_BOOK_LIMIT + bookBonus,
      spinSpeedMultiplier,
      hasSurpriseMe,
      hasGoldenBorder,
      hasExportWishlist,
      hasSnarkyTooltips,
    };
  }, [unlockedAchievements]);
}
