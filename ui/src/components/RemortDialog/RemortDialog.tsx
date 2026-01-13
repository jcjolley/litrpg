import styles from './RemortDialog.module.css';

interface RemortDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemortDialog({ isOpen, onConfirm, onCancel }: RemortDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    // Clear all litrpg localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('litrpg-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Reload the page
    window.location.reload();
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onCancel} />
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>REMORT?</h2>
        </div>

        <div className={styles.body}>
          <p className={styles.warning}>This will reset ALL progress:</p>
          <ul className={styles.list}>
            <li>All achievements will be locked</li>
            <li>Your wishlist will be cleared</li>
            <li>Dismissed books will return</li>
            <li>Filters will be reset</li>
            <li>Theme will reset to Classic Blue</li>
          </ul>
          <p className={styles.note}>This cannot be undone!</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm} type="button">
            Yes, Remort
          </button>
        </div>
      </div>
    </>
  );
}
