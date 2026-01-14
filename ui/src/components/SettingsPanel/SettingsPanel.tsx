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
      </div>
    </>
  );
}
