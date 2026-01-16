import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Announcement } from '../types/announcement';
import { getAnnouncements, recordAnnouncementUpvote, recordAnnouncementDownvote } from '../api/announcements';

const ANNOUNCEMENTS_READ_KEY = 'litrpg-announcements-read';
const ANNOUNCEMENTS_VOTES_KEY = 'litrpg-announcement-votes';

export type VoteType = 'up' | 'down';

interface AnnouncementVotes {
  [announcementId: string]: VoteType;
}

interface UseAnnouncementsResult {
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
  unreadCount: number;
  readCount: number;
  markAllRead: () => void;
  getVote: (id: string) => VoteType | null;
  vote: (id: string, direction: VoteType) => void;
  refetch: () => Promise<void>;
}

function loadReadIds(): string[] {
  try {
    const stored = localStorage.getItem(ANNOUNCEMENTS_READ_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveReadIds(ids: string[]): void {
  try {
    localStorage.setItem(ANNOUNCEMENTS_READ_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save read IDs:', err);
  }
}

function loadVotes(): AnnouncementVotes {
  try {
    const stored = localStorage.getItem(ANNOUNCEMENTS_VOTES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveVotes(votes: AnnouncementVotes): void {
  try {
    localStorage.setItem(ANNOUNCEMENTS_VOTES_KEY, JSON.stringify(votes));
  } catch (err) {
    console.error('Failed to save votes:', err);
  }
}

export function useAnnouncements(): UseAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [readIds, setReadIds] = useState<string[]>(loadReadIds);
  const [votes, setVotes] = useState<AnnouncementVotes>(loadVotes);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch announcements'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Sync readIds to localStorage
  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  // Sync votes to localStorage
  useEffect(() => {
    saveVotes(votes);
  }, [votes]);

  const unreadCount = useMemo(() => {
    return announcements.filter(a => !readIds.includes(a.id)).length;
  }, [announcements, readIds]);

  const readCount = useMemo(() => {
    return readIds.length;
  }, [readIds]);

  const markAllRead = useCallback(() => {
    const allIds = announcements.map(a => a.id);
    setReadIds(prev => {
      const combined = new Set([...prev, ...allIds]);
      return Array.from(combined);
    });
  }, [announcements]);

  const getVote = useCallback(
    (id: string): VoteType | null => votes[id] || null,
    [votes]
  );

  const vote = useCallback((id: string, direction: VoteType) => {
    // Only allow voting if not already voted in that direction
    if (votes[id] === direction) return;

    // Optimistically update local state
    setVotes(prev => ({
      ...prev,
      [id]: direction,
    }));

    // Update announcement vote counts optimistically
    setAnnouncements(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        const prevVote = votes[id];
        let newUpvotes = a.upvoteCount;
        let newDownvotes = a.downvoteCount;

        // Remove previous vote effect if changing
        if (prevVote === 'up') newUpvotes--;
        if (prevVote === 'down') newDownvotes--;

        // Add new vote effect
        if (direction === 'up') newUpvotes++;
        if (direction === 'down') newDownvotes++;

        return {
          ...a,
          upvoteCount: newUpvotes,
          downvoteCount: newDownvotes,
        };
      })
    );

    // Send to server (fire and forget)
    if (direction === 'up') {
      recordAnnouncementUpvote(id).catch(console.error);
    } else {
      recordAnnouncementDownvote(id).catch(console.error);
    }
  }, [votes]);

  const refetch = useCallback(async () => {
    await fetchAnnouncements();
  }, [fetchAnnouncements]);

  return {
    announcements,
    isLoading,
    error,
    unreadCount,
    readCount,
    markAllRead,
    getVote,
    vote,
    refetch,
  };
}
