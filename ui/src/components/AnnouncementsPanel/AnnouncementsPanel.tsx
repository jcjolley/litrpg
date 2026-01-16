import { useState, useMemo } from 'react';
import type { Announcement } from '../../types/announcement';
import type { VoteType } from '../../hooks/useAnnouncements';
import styles from './AnnouncementsPanel.module.css';

interface AnnouncementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  isLoading: boolean;
  isRead: (id: string) => boolean;
  getVote: (id: string) => VoteType | null;
  onVote: (id: string, direction: VoteType) => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface AnnouncementCardProps {
  announcement: Announcement;
  userVote: VoteType | null;
  onVote: (direction: VoteType) => void;
  defaultExpanded: boolean;
}

function AnnouncementCard({ announcement, userVote, onVote, defaultExpanded }: AnnouncementCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const baseScore = announcement.upvoteCount - announcement.downvoteCount;
  const userVoteAdjustment = userVote === 'up' ? 1 : userVote === 'down' ? -1 : 0;
  const netScore = baseScore + userVoteAdjustment;
  const scoreDisplay = netScore >= 0 ? `+${netScore}` : `${netScore}`;

  return (
    <div className={`${styles.card} ${isExpanded ? styles.cardExpanded : styles.cardCollapsed}`}>
      <button
        className={styles.cardHeaderButton}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className={styles.cardExpandArrow}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <h3 className={styles.cardTitle}>{announcement.title}</h3>
        <span className={styles.cardDate}>{formatDate(announcement.createdAt)}</span>
      </button>
      {isExpanded && (
        <div className={styles.cardContent}>
          <p className={styles.cardBody}>{announcement.body}</p>
          <div className={styles.cardFooter}>
            <div className={styles.voteButtons}>
              <button
                className={`${styles.voteButton} ${styles.voteUp} ${userVote === 'up' ? styles.voteActive : ''}`}
                onClick={() => onVote('up')}
                title="Upvote"
              >
                +1
              </button>
              <span className={`${styles.voteScore} ${netScore > 0 ? styles.voteScorePositive : netScore < 0 ? styles.voteScoreNegative : ''}`}>
                {scoreDisplay}
              </span>
              <button
                className={`${styles.voteButton} ${styles.voteDown} ${userVote === 'down' ? styles.voteActive : ''}`}
                onClick={() => onVote('down')}
                title="Downvote"
              >
                -1
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnnouncementsPanel({
  isOpen,
  onClose,
  announcements,
  isLoading,
  isRead,
  getVote,
  onVote,
}: AnnouncementsPanelProps) {
  // Sort by newest first
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => b.createdAt - a.createdAt);
  }, [announcements]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return announcements.filter(a => !isRead(a.id)).length;
  }, [announcements, isRead]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>ANNOUNCEMENTS</h2>
          <span className={styles.count}>[{unreadCount}]</span>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Announcements List */}
        <div className={styles.list}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>&#8987;</span>
              <p className={styles.emptyText}>Loading...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>&#128276;</span>
              <p className={styles.emptyText}>No announcements yet</p>
              <p className={styles.emptyHint}>Check back later for updates!</p>
            </div>
          ) : (
            sortedAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                userVote={getVote(announcement.id)}
                onVote={(direction) => onVote(announcement.id, direction)}
                defaultExpanded={!isRead(announcement.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
