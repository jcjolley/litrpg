import { useState, useEffect, useCallback } from 'react';

const COMPLETED_KEY = 'litrpg-completed';

export interface CompletedEntry {
  bookId: string;
  completedAt: number; // timestamp
}

interface UseCompletedResult {
  completed: CompletedEntry[];
  addCompleted: (bookId: string) => void;
  removeCompleted: (bookId: string) => void;
  isCompleted: (bookId: string) => boolean;
  clearCompleted: () => void;
  count: number;
}

export function useCompleted(): UseCompletedResult {
  const [completed, setCompleted] = useState<CompletedEntry[]>(() => {
    try {
      const stored = localStorage.getItem(COMPLETED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
  }, [completed]);

  const addCompleted = useCallback((bookId: string) => {
    setCompleted((prev) => {
      // Check if already completed
      if (prev.some((entry) => entry.bookId === bookId)) {
        return prev;
      }

      // Add new entry at the beginning
      const newEntry: CompletedEntry = {
        bookId,
        completedAt: Date.now(),
      };

      return [newEntry, ...prev];
    });
  }, []);

  const removeCompleted = useCallback((bookId: string) => {
    setCompleted((prev) => prev.filter((entry) => entry.bookId !== bookId));
  }, []);

  const isCompleted = useCallback(
    (bookId: string) => {
      return completed.some((entry) => entry.bookId === bookId);
    },
    [completed]
  );

  const clearCompleted = useCallback(() => {
    setCompleted([]);
  }, []);

  return {
    completed,
    addCompleted,
    removeCompleted,
    isCompleted,
    clearCompleted,
    count: completed.length,
  };
}
