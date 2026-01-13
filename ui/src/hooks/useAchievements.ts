import { useState, useEffect, useCallback } from 'react';

const ACHIEVEMENTS_KEY = 'litrpg-achievements';

// Achievement definitions
export interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  description: string;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  contrarian: {
    id: 'contrarian',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'The Contrarian',
    description: 'Said "No" when asked if you like LitRPG',
  },
  firstWishlist: {
    id: 'firstWishlist',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Curious Reader',
    description: 'Added your first book to the wishlist',
  },
  wishlist5: {
    id: 'wishlist5',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Book Hoarder',
    description: 'Added 5 books to your wishlist',
  },
  wishlist10: {
    id: 'wishlist10',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Library Builder',
    description: 'Added 10 books to your wishlist',
  },
  picky: {
    id: 'picky',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'The Critic',
    description: 'Marked 10 books as not interested',
  },
  explorer: {
    id: 'explorer',
    title: 'ACHIEVEMENT UNLOCKED!',
    subtitle: 'Genre Explorer',
    description: 'Tried filtering by 3 different genres',
  },
};

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
  trackSpin: () => void;
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

  const trackSpin = useCallback(() => {
    setData((prev) => ({
      ...prev,
      stats: { ...prev.stats, totalSpins: prev.stats.totalSpins + 1 },
    }));
  }, []);

  return {
    unlockedAchievements: data.unlocked,
    isUnlocked,
    unlock,
    stats: data.stats,
    trackGenreExplored,
    trackSpin,
  };
}
