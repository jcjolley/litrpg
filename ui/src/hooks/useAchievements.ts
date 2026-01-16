import { useState, useEffect, useCallback } from 'react';

const ACHIEVEMENTS_KEY = 'litrpg-achievements';

// Achievement definitions
export type EffectType = 'books' | 'speed' | 'feature' | 'visual';

export interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  effect?: string; // Human-readable effect description
  effectType?: EffectType;
  effectValue?: number; // e.g., 10 for +10 books, 0.75 for 25% faster
  themeUnlock?: string; // Theme ID unlocked by this achievement
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  contrarian: {
    id: 'contrarian',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'The Contrarian',
    description: 'Said "No" when asked if you like LitRPG',
    effect: 'Snarky tooltips enabled',
    effectType: 'feature',
  },
  firstWishlist: {
    id: 'firstWishlist',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Curious Reader',
    description: 'Added your first book to the wishlist',
    effect: 'Wishlist export unlocked',
    effectType: 'feature',
  },
  wishlist5: {
    id: 'wishlist5',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Book Hoarder',
    description: 'Added 5 books to your wishlist',
    effect: '+10 books available (30 total)',
    effectType: 'books',
    effectValue: 10,
  },
  wishlist10: {
    id: 'wishlist10',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Library Builder',
    description: 'Added 10 books to your wishlist',
    effect: '+20 books available (50 total)',
    effectType: 'books',
    effectValue: 20,
    themeUnlock: 'gilded-gold',
  },
  picky: {
    id: 'picky',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'The Critic',
    description: 'Marked 10 books as not interested',
    effect: '25% faster carousel spin',
    effectType: 'speed',
    effectValue: 0.75,
    themeUnlock: 'noir',
  },
  explorer: {
    id: 'explorer',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Genre Explorer',
    description: 'Tried filtering by 3 different genres',
    effect: '"Surprise Me" filter unlocked',
    effectType: 'feature',
    themeUnlock: 'forest-green',
  },
  speedReader: {
    id: 'speedReader',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Speed Reader',
    description: 'Spun the carousel 50 times',
    effect: '50% faster carousel spin',
    effectType: 'speed',
    effectValue: 0.5,
    themeUnlock: 'crimson-red',
  },
  firstCompleted: {
    id: 'firstCompleted',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'First Conquest',
    description: 'Completed your first audiobook!',
  },
  completed5: {
    id: 'completed5',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Apprentice Reader',
    description: 'Completed 5 audiobooks',
  },
  completed10: {
    id: 'completed10',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Journeyman Reader',
    description: 'Completed 10 audiobooks',
  },
  completed20: {
    id: 'completed20',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Expert Reader',
    description: 'Completed 20 audiobooks',
  },
  completed50: {
    id: 'completed50',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Master Reader',
    description: 'Completed 50 audiobooks - A true bibliophile!',
  },
  konami: {
    id: 'konami',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Classic Gamer',
    description: 'Entered the Konami code',
    effect: 'Retro mode unlocked',
    effectType: 'feature',
  },
  townCrier: {
    id: 'townCrier',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Town Crier',
    description: 'Read 5 announcements - Hear ye, hear ye!',
    effect: 'You feel more connected to the realm',
    effectType: 'feature',
  },
  completionist: {
    id: 'completionist',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Completionist',
    description: 'Unlocked all other achievements',
    effect: 'Golden carousel border',
    effectType: 'visual',
    themeUnlock: 'rainbow-shift',
  },
};

// Achievements required for completionist (all except completionist itself)
const COMPLETIONIST_REQUIREMENTS = [
  'contrarian',
  'firstWishlist',
  'wishlist5',
  'wishlist10',
  'picky',
  'explorer',
  'speedReader',
  'firstCompleted',
  'completed5',
  'completed10',
  'completed20',
  'completed50',
  'konami',
  'townCrier',
];

interface StoredAchievements {
  unlocked: string[];
  stats: {
    genresExplored: string[];
    totalSpins: number;
  };
}

interface UseAchievementsResult {
  unlockedAchievements: string[];
  isUnlocked: (achievementId: string) => boolean;
  unlock: (achievementId: string) => Achievement | null;
  stats: StoredAchievements['stats'];
  trackGenreExplored: (genre: string) => Achievement | null;
  trackSpin: () => Achievement | null;
  pendingCompletionist: Achievement | null;
  consumeCompletionist: () => void;
}

const defaultStats: StoredAchievements['stats'] = {
  genresExplored: [],
  totalSpins: 0,
};

export function useAchievements(): UseAchievementsResult {
  const [data, setData] = useState<StoredAchievements>(() => {
    try {
      const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          unlocked: parsed.unlocked || [],
          stats: { ...defaultStats, ...parsed.stats },
        };
      }
      return { unlocked: [], stats: defaultStats };
    } catch {
      return { unlocked: [], stats: defaultStats };
    }
  });

  useEffect(() => {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
  }, [data]);

  // Check for completionist achievement when unlocked achievements change
  const [pendingCompletionist, setPendingCompletionist] = useState<Achievement | null>(null);

  useEffect(() => {
    // Check if all requirements are met and completionist not already unlocked
    const hasAllRequired = COMPLETIONIST_REQUIREMENTS.every((id) => data.unlocked.includes(id));
    const alreadyHasCompletionist = data.unlocked.includes('completionist');

    if (hasAllRequired && !alreadyHasCompletionist) {
      setData((prev) => ({
        ...prev,
        unlocked: [...prev.unlocked, 'completionist'],
      }));
      setPendingCompletionist(ACHIEVEMENTS.completionist);
    }
  }, [data.unlocked]);

  const isUnlocked = useCallback(
    (achievementId: string) => data.unlocked.includes(achievementId),
    [data.unlocked]
  );

  const unlock = useCallback(
    (achievementId: string): Achievement | null => {
      if (data.unlocked.includes(achievementId)) {
        return null; // Already unlocked
      }
      const achievement = ACHIEVEMENTS[achievementId];
      if (!achievement) {
        return null; // Unknown achievement
      }
      setData((prev) => ({
        ...prev,
        unlocked: [...prev.unlocked, achievementId],
      }));
      return achievement;
    },
    [data.unlocked]
  );

  const trackGenreExplored = useCallback(
    (genre: string): Achievement | null => {
      if (!genre || data.stats.genresExplored.includes(genre)) {
        return null;
      }

      const newGenres = [...data.stats.genresExplored, genre];
      setData((prev) => ({
        ...prev,
        stats: { ...prev.stats, genresExplored: newGenres },
      }));

      // Check if we should unlock explorer achievement
      if (newGenres.length >= 3 && !data.unlocked.includes('explorer')) {
        setData((prev) => ({
          ...prev,
          unlocked: [...prev.unlocked, 'explorer'],
        }));
        return ACHIEVEMENTS.explorer;
      }
      return null;
    },
    [data.stats.genresExplored, data.unlocked]
  );

  const trackSpin = useCallback((): Achievement | null => {
    let unlockedAchievement: Achievement | null = null;

    setData((prev) => {
      const newSpins = prev.stats.totalSpins + 1;
      const newData = {
        ...prev,
        stats: { ...prev.stats, totalSpins: newSpins },
      };

      // Check for speedReader achievement at 50 spins
      if (newSpins >= 50 && !prev.unlocked.includes('speedReader')) {
        newData.unlocked = [...prev.unlocked, 'speedReader'];
        unlockedAchievement = ACHIEVEMENTS.speedReader;
      }

      return newData;
    });

    return unlockedAchievement;
  }, []);

  const consumeCompletionist = useCallback(() => {
    setPendingCompletionist(null);
  }, []);

  return {
    unlockedAchievements: data.unlocked,
    isUnlocked,
    unlock,
    stats: data.stats,
    trackGenreExplored,
    trackSpin,
    pendingCompletionist,
    consumeCompletionist,
  };
}
