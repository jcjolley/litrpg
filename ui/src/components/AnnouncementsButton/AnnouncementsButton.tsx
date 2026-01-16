import styles from './AnnouncementsButton.module.css';

interface AnnouncementsButtonProps {
  unreadCount: number;
  onClick: () => void;
}

export function AnnouncementsButton({ unreadCount, onClick }: AnnouncementsButtonProps) {
  return (
    <button
      className={styles.button}
      onClick={onClick}
      type="button"
      title={unreadCount > 0 ? `${unreadCount} new announcement${unreadCount > 1 ? 's' : ''}` : 'Announcements'}
    >
      <span className={styles.bellIcon}>&#128276;</span>
      {unreadCount > 0 && (
        <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
      )}
    </button>
  );
}
