import { useState, useEffect, useCallback } from 'react';

const VOTES_KEY = 'litrpg-votes';

export type VoteType = 'up' | 'down';

interface Votes {
  [bookId: string]: VoteType;
}

interface UseVotesResult {
  votes: Votes;
  getVote: (bookId: string) => VoteType | null;
  setVote: (bookId: string, vote: VoteType) => void;
  clearVote: (bookId: string) => void;
  hasVoted: (bookId: string) => boolean;
}

export function useVotes(): UseVotesResult {
  const [votes, setVotes] = useState<Votes>(() => {
    try {
      const stored = localStorage.getItem(VOTES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  }, [votes]);

  const getVote = useCallback(
    (bookId: string): VoteType | null => votes[bookId] || null,
    [votes]
  );

  const setVote = useCallback((bookId: string, vote: VoteType) => {
    setVotes((prev) => ({
      ...prev,
      [bookId]: vote,
    }));
  }, []);

  const clearVote = useCallback((bookId: string) => {
    setVotes((prev) => {
      const { [bookId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const hasVoted = useCallback(
    (bookId: string) => bookId in votes,
    [votes]
  );

  return {
    votes,
    getVote,
    setVote,
    clearVote,
    hasVoted,
  };
}
