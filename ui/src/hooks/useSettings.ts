import { useState, useEffect, useCallback } from 'react';

const SETTINGS_KEY = 'litrpg-settings';

export interface UserSettings {
  hideSeenBooks: boolean;      // Filter out books user has already seen
  hideCompletedBooks: boolean; // Filter out completed books
}

const DEFAULT_SETTINGS: UserSettings = {
  hideSeenBooks: true,
  hideCompletedBooks: true,
};

interface UseSettingsResult {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
