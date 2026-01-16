import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const THEME_KEY = 'litrpg-theme';

// All available themes in the system
export const ALL_THEMES = [
  { id: 'classic-blue', name: 'Classic Blue', unlockedBy: null },
  { id: 'gilded-gold', name: 'Gilded Gold', unlockedBy: 'wishlist10' },
  { id: 'noir', name: 'Noir', unlockedBy: 'picky' },
  { id: 'forest-green', name: 'Forest Green', unlockedBy: 'explorer' },
  { id: 'crimson-red', name: 'Crimson Red', unlockedBy: 'speedReader' },
  { id: 'princess-pink', name: 'Princess Pink', unlockedBy: 'lydia' },
  { id: 'rainbow-shift', name: 'Rainbow Shift', unlockedBy: 'completionist' },
] as const;

export type ThemeId = typeof ALL_THEMES[number]['id'];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: typeof ALL_THEMES;
  isThemeUnlocked: (themeId: ThemeId) => boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  unlockedAchievements: string[];
}

export function ThemeProvider({ children, unlockedAchievements }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored && ALL_THEMES.some((t) => t.id === stored)) {
        return stored as ThemeId;
      }
      return 'classic-blue';
    } catch {
      return 'classic-blue';
    }
  });

  // Check if a theme is unlocked based on achievements
  const isThemeUnlocked = useCallback(
    (themeId: ThemeId): boolean => {
      const themeConfig = ALL_THEMES.find((t) => t.id === themeId);
      if (!themeConfig) return false;
      if (themeConfig.unlockedBy === null) return true; // Default theme always available
      return unlockedAchievements.includes(themeConfig.unlockedBy);
    },
    [unlockedAchievements]
  );

  // Set theme with validation
  const setTheme = useCallback(
    (newTheme: ThemeId) => {
      // Only allow setting unlocked themes
      if (!isThemeUnlocked(newTheme)) {
        console.warn(`Theme "${newTheme}" is not unlocked yet`);
        return;
      }
      setThemeState(newTheme);
      localStorage.setItem(THEME_KEY, newTheme);
    },
    [isThemeUnlocked]
  );

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // If current theme becomes locked (e.g., after remort), reset to default
  useEffect(() => {
    if (!isThemeUnlocked(theme)) {
      setThemeState('classic-blue');
      localStorage.setItem(THEME_KEY, 'classic-blue');
    }
  }, [theme, isThemeUnlocked]);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    availableThemes: ALL_THEMES,
    isThemeUnlocked,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
