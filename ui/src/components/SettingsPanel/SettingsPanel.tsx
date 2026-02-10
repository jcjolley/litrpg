import type { UserSettings } from '../../hooks/useSettings';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSettingsChange: (updates: Partial<UserSettings>) => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>SETTINGS</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Book Filtering Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>BOOK FILTERING</div>

          <label className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Hide books I've already seen</span>
            <input
              type="checkbox"
              className={styles.toggleInput}
              checked={settings.hideSeenBooks}
              onChange={(e) => onSettingsChange({ hideSeenBooks: e.target.checked })}
            />
            <span className={styles.toggleSwitch} />
          </label>

          <label className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Hide completed books</span>
            <input
              type="checkbox"
              className={styles.toggleInput}
              checked={settings.hideCompletedBooks}
              onChange={(e) => onSettingsChange({ hideCompletedBooks: e.target.checked })}
            />
            <span className={styles.toggleSwitch} />
          </label>
        </div>

        {/* Info Section */}
        <div className={styles.section}>
          <div className={styles.infoText}>
            These settings control which books appear in the recommendation spinner.
            Disabling filters will show more books but may include ones you've already seen or completed.
          </div>
        </div>

        {/* Recommendation Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>LOOKING FOR MORE?</div>
          <div className={styles.infoText}>
            Want more curated LitRPG recommendations? Check out{' '}
            <a
              href="https://ranknread.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
            >
              Rank N Read
            </a>
            —a community-driven site that generates recommendations based on user-provided tier lists.
          </div>
          <div className={styles.disclaimer}>
            Not affiliated with any recommended sites.
          </div>
        </div>

        {/* Support Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>SUPPORT THE GUILD</div>
          <div className={styles.infoText}>
            Want to keep the tavern lights on?{' '}
            <a
              href="https://patreon.com/jcjolley"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
            >
              Buy me a potion on Patreon
            </a>
          </div>
          <div className={styles.infoText}>
            New to audiobooks?{' '}
            <a
              href="https://www.amazon.com/hz/audible/mlp/membership/premiumplus?tag=jolleyboy-20"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
            >
              Try Audible free
            </a>
          </div>
          <div className={styles.disclaimer}>
            Affiliate link: Audible trial signups may earn the guild a bounty.
          </div>
        </div>
      </div>
    </>
  );
}
