import { useMemo } from 'react';
import { useTheme, ALL_THEMES, type ThemeId } from '../../contexts/ThemeContext';
import { ACHIEVEMENTS, type Achievement } from '../../hooks/useAchievements';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedAchievements: string[];
  stats: {
    genresExplored: string[];
    totalSpins: number;
  };
  wishlistCount: number;
  notInterestedCount: number;
  onRemort: () => void;
}

// Stats caps for progress bar calculations
const STAT_CAPS = {
  curiosity: 10, // wishlist count for 100%
  pickiness: 10, // not interested count for 100%
  exploration: 5, // genres explored for 100%
  dedication: 50, // spins for 100%
};

// Achievement progress requirements for locked achievements
const ACHIEVEMENT_PROGRESS = {
  firstWishlist: { current: (p: StatsPanelProps) => p.wishlistCount, target: 1, label: 'book' },
  wishlist5: { current: (p: StatsPanelProps) => p.wishlistCount, target: 5, label: 'books' },
  wishlist10: { current: (p: StatsPanelProps) => p.wishlistCount, target: 10, label: 'books' },
  picky: { current: (p: StatsPanelProps) => p.notInterestedCount, target: 10, label: 'dismissed' },
  explorer: { current: (p: StatsPanelProps) => p.stats.genresExplored.length, target: 3, label: 'genres' },
  speedReader: { current: (p: StatsPanelProps) => p.stats.totalSpins, target: 50, label: 'spins' },
};

export function StatsPanel({
  isOpen,
  onClose,
  unlockedAchievements,
  stats,
  wishlistCount,
  notInterestedCount,
  onRemort,
}: StatsPanelProps) {
  const { theme, setTheme, isThemeUnlocked } = useTheme();

  // Calculate level based on achievements
  const level = useMemo(() => {
    return Math.floor(unlockedAchievements.length * 1.5) + 1;
  }, [unlockedAchievements]);

  // Calculate stat percentages
  const statValues = useMemo(
    () => ({
      curiosity: Math.min(100, (wishlistCount / STAT_CAPS.curiosity) * 100),
      pickiness: Math.min(100, (notInterestedCount / STAT_CAPS.pickiness) * 100),
      exploration: Math.min(100, (stats.genresExplored.length / STAT_CAPS.exploration) * 100),
      dedication: Math.min(100, (stats.totalSpins / STAT_CAPS.dedication) * 100),
    }),
    [wishlistCount, notInterestedCount, stats]
  );

  // Get all achievements with their unlock status
  const achievementList = useMemo(() => {
    return Object.values(ACHIEVEMENTS).map((achievement) => ({
      ...achievement,
      isUnlocked: unlockedAchievements.includes(achievement.id),
    }));
  }, [unlockedAchievements]);

  // Find next achievement to unlock
  const nextAchievement = useMemo(() => {
    const locked = achievementList.find((a) => !a.isUnlocked && a.id !== 'completionist');
    return locked ?? null;
  }, [achievementList]);

  // Get progress for a locked achievement
  const getProgress = (id: string) => {
    const progress = ACHIEVEMENT_PROGRESS[id as keyof typeof ACHIEVEMENT_PROGRESS];
    if (!progress) return null;
    const props = { stats, wishlistCount, notInterestedCount } as StatsPanelProps;
    return {
      current: progress.current(props),
      target: progress.target,
      label: progress.label,
    };
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>READER STATS</h2>
          <span className={styles.level}>LV. {level}</span>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Stats Bars */}
        <div className={styles.section}>
          <StatBar name="CURIOSITY" value={statValues.curiosity} label={`x${wishlistCount} wishlisted`} />
          <StatBar name="PICKINESS" value={statValues.pickiness} label={`x${notInterestedCount} dismissed`} />
          <StatBar
            name="EXPLORATION"
            value={statValues.exploration}
            label={`x${stats.genresExplored.length} genres`}
          />
          <StatBar name="DEDICATION" value={statValues.dedication} label={`x${stats.totalSpins} spins`} />
        </div>

        {/* Titles Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>TITLES EARNED</span>
            <span className={styles.counter}>
              [{unlockedAchievements.length}/{Object.keys(ACHIEVEMENTS).length}]
            </span>
          </div>

          <div className={styles.achievementList}>
            {/* Show unlocked achievements */}
            {achievementList
              .filter((a) => a.isUnlocked)
              .map((achievement) => (
                <AchievementRow
                  key={achievement.id}
                  achievement={achievement}
                  isUnlocked={true}
                  progress={null}
                />
              ))}

            {/* Show next achievement to unlock with progress */}
            {nextAchievement && (
              <AchievementRow
                key={nextAchievement.id}
                achievement={nextAchievement}
                isUnlocked={false}
                progress={getProgress(nextAchievement.id)}
              />
            )}

            {/* Show mystery placeholders for remaining locked achievements */}
            {achievementList
              .filter((a) => !a.isUnlocked && a.id !== nextAchievement?.id)
              .map((achievement) => (
                <div key={achievement.id} className={`${styles.achievementRow} ${styles.achievementHidden}`}>
                  <span className={styles.achievementIcon}>{'\u2606'}</span>
                  <div className={styles.achievementInfo}>
                    <span className={styles.achievementTitle}>???</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Theme Selector */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>THEME</div>
          <select
            className={styles.themeSelect}
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
          >
            {ALL_THEMES.map((t) => (
              <option key={t.id} value={t.id} disabled={!isThemeUnlocked(t.id)}>
                {t.name}
                {!isThemeUnlocked(t.id) && ' (Locked)'}
              </option>
            ))}
          </select>
        </div>

        {/* Remort Button */}
        <div className={styles.section}>
          <button className={styles.remortButton} onClick={onRemort} type="button">
            REMORT - Start Fresh
          </button>
        </div>
      </div>
    </>
  );
}

// Stat bar component
function StatBar({ name, value, label }: { name: string; value: number; label: string }) {
  const filled = Math.floor(value / 10);

  return (
    <div className={styles.statRow}>
      <span className={styles.statName}>
        {name.split('').map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </span>
      <div className={styles.statBar}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`${styles.statBlock} ${i < filled ? styles.statBlockFilled : ''}`} />
        ))}
      </div>
      <span className={styles.statValue}>{Math.floor(value)}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

// Achievement row component
function AchievementRow({
  achievement,
  isUnlocked,
  progress,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  progress: { current: number; target: number; label: string } | null;
}) {
  return (
    <div className={`${styles.achievementRow} ${isUnlocked ? styles.achievementUnlocked : styles.achievementLocked}`}>
      <span className={styles.achievementIcon}>{isUnlocked ? '\u2605' : '\u2606'}</span>
      <div className={styles.achievementInfo}>
        <span className={styles.achievementTitle}>{achievement.subtitle}</span>
        {isUnlocked && achievement.effect && (
          <span className={styles.achievementEffect}>{achievement.effect}</span>
        )}
        {!isUnlocked && progress && (
          <span className={styles.achievementProgress}>
            ({progress.current}/{progress.target} {progress.label})
          </span>
        )}
      </div>
    </div>
  );
}
