import { useState, useEffect, useCallback } from 'react';

const NOT_INTERESTED_KEY = 'litrpg-not-interested';

interface UseNotInterestedResult {
  notInterestedIds: string[];
  addNotInterested: (bookId: string) => void;
  removeNotInterested: (bookId: string) => void;
  isNotInterested: (bookId: string) => boolean;
  clearNotInterested: () => void;
  count: number;
}

export function useNotInterested(): UseNotInterestedResult {
  const [notInterestedIds, setNotInterestedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(NOT_INTERESTED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(NOT_INTERESTED_KEY, JSON.stringify(notInterestedIds));
  }, [notInterestedIds]);

  const addNotInterested = useCallback((bookId: string) => {
    setNotInterestedIds((prev) => {
      if (prev.includes(bookId)) return prev;
      return [...prev, bookId];
    });
  }, []);

  const removeNotInterested = useCallback((bookId: string) => {
    setNotInterestedIds((prev) => prev.filter((id) => id !== bookId));
  }, []);

  const isNotInterested = useCallback(
    (bookId: string) => notInterestedIds.includes(bookId),
    [notInterestedIds]
  );

  const clearNotInterested = useCallback(() => {
    setNotInterestedIds([]);
  }, []);

  return {
    notInterestedIds,
    addNotInterested,
    removeNotInterested,
    isNotInterested,
    clearNotInterested,
    count: notInterestedIds.length,
  };
}
