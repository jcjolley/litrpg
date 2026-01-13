import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'litrpg-history';
const MAX_HISTORY_SIZE = 50;

export interface HistoryEntry {
  bookId: string;
  viewedAt: number; // timestamp
}

interface UseHistoryResult {
  history: HistoryEntry[];
  addToHistory: (bookId: string) => void;
  clearHistory: () => void;
  count: number;
}

export function useHistory(): UseHistoryResult {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const addToHistory = useCallback((bookId: string) => {
    setHistory((prev) => {
      // Remove existing entry for this book (if any) to avoid duplicates
      const filtered = prev.filter((entry) => entry.bookId !== bookId);

      // Add new entry at the beginning
      const newEntry: HistoryEntry = {
        bookId,
        viewedAt: Date.now(),
      };

      // Keep only the most recent entries
      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_SIZE);

      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    count: history.length,
  };
}
