import { useEffect, useState } from 'react';
import styles from './AchievementNotification.module.css';

interface AchievementNotificationProps {
  title: string;
  subtitle: string;
  description?: string;
  isVisible: boolean;
  onDismiss?: () => void;
  duration?: number;
}

export function AchievementNotification({
  title,
  subtitle,
  description,
  isVisible,
  onDismiss,
  duration = 3000,
}: AchievementNotificationProps) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const dismissTimer = setTimeout(() => {
        setIsAnimatingOut(true);
      }, duration);

      const removeTimer = setTimeout(() => {
        onDismiss?.();
        setIsAnimatingOut(false);
      }, duration + 300);

      return () => {
        clearTimeout(dismissTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`${styles.notification} ${isAnimatingOut ? styles.animateOut : ''}`}
    >
      <div className={styles.icon}>★</div>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>"{subtitle}"</div>
        {description && <div className={styles.description}>{description}</div>}
      </div>
    </div>
  );
}
