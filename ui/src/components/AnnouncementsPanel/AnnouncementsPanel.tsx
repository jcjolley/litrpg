import type { Announcement } from '../../types/announcement';
import type { VoteType } from '../../hooks/useAnnouncements';
import styles from './AnnouncementsPanel.module.css';

interface AnnouncementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  isLoading: boolean;
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
}

function AnnouncementCard({ announcement, userVote, onVote }: AnnouncementCardProps) {
  const baseScore = announcement.upvoteCount - announcement.downvoteCount;
  const userVoteAdjustment = userVote === 'up' ? 1 : userVote === 'down' ? -1 : 0;
  const netScore = baseScore + userVoteAdjustment;
  const scoreDisplay = netScore >= 0 ? `+${netScore}` : `${netScore}`;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{announcement.title}</h3>
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
      <p className={styles.cardBody}>{announcement.body}</p>
      <span className={styles.cardDate}>{formatDate(announcement.createdAt)}</span>
    </div>
  );
}

export function AnnouncementsPanel({
  isOpen,
  onClose,
  announcements,
  isLoading,
  getVote,
  onVote,
}: AnnouncementsPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>ANNOUNCEMENTS</h2>
          <span className={styles.count}>[{announcements.length}]</span>
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
            announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                userVote={getVote(announcement.id)}
                onVote={(direction) => onVote(announcement.id, direction)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
