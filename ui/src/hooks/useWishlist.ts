import { useState, useEffect, useCallback } from 'react';

const WISHLIST_KEY = 'litrpg-wishlist';

interface UseWishlistResult {
  wishlist: string[];
  addToWishlist: (bookId: string) => void;
  removeFromWishlist: (bookId: string) => void;
  isInWishlist: (bookId: string) => boolean;
  clearWishlist: () => void;
}

export function useWishlist(): UseWishlistResult {
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = useCallback((bookId: string) => {
    setWishlist((prev) => {
      if (prev.includes(bookId)) return prev;
      return [...prev, bookId];
    });
  }, []);

  const removeFromWishlist = useCallback((bookId: string) => {
    setWishlist((prev) => prev.filter((id) => id !== bookId));
  }, []);

  const isInWishlist = useCallback(
    (bookId: string) => wishlist.includes(bookId),
    [wishlist]
  );

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
  };
}
