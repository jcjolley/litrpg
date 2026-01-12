import styles from './SystemDialog.module.css';

interface DialogButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function DialogButton({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
}: DialogButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.buttonIcon}>▶</span>
      {children}
    </button>
  );
}
