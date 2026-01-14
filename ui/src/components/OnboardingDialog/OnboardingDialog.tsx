import { useEffect, useState } from 'react';
import styles from './OnboardingDialog.module.css';

type OnboardingPhase = 'initial' | 'snarky';

interface OnboardingDialogProps {
  isOpen: boolean;
  phase: OnboardingPhase;
  onYes: () => void;
  onNo: () => void;
  onCountdownComplete: () => void;
  countdownSeconds?: number;
}

export function OnboardingDialog({
  isOpen,
  phase,
  onYes,
  onNo,
  onCountdownComplete,
  countdownSeconds = 4,
}: OnboardingDialogProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);

  // Reset and start countdown when entering snarky phase
  useEffect(() => {
    if (phase === 'snarky') {
      setCountdown(countdownSeconds);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [phase, countdownSeconds]);

  // Trigger callback when countdown hits 0
  useEffect(() => {
    if (phase === 'snarky' && countdown === 0) {
      onCountdownComplete();
    }
  }, [phase, countdown, onCountdownComplete]);

  if (!isOpen) return null;

  // Handle clicks on the dialog area - anything except the No button triggers Yes
  const handleDialogClick = (e: React.MouseEvent) => {
    // Only handle clicks in initial phase
    if (phase !== 'initial') return;

    // Check if the click was on the No button (let it handle itself)
    const target = e.target as HTMLElement;
    if (target.closest('[data-action="no"]')) return;

    onYes();
  };

  return (
    <div className={styles.overlay} onClick={handleDialogClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.headerText}>SYSTEM MESSAGE</span>
        </div>

        <div className={styles.content}>
          {phase === 'initial' ? (
            <>
              <p className={styles.message}>
                Are you ready to enter your next world?
              </p>
              <div className={styles.actions}>
                <button className={styles.button} onClick={onYes}>
                  <span className={styles.buttonIcon}>▶</span>
                  YES
                </button>
                <button className={styles.button} onClick={onNo} data-action="no">
                  <span className={styles.buttonIcon}>▶</span>
                  NO
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.message}>Oh, a wise guy, huh?</p>
              <p className={styles.subMessage}>
                Fine. Your reward for being clever?
                <br />
                I'll spin it for you this time.
              </p>
              <div className={styles.countdown}>
                <span className={styles.countdownNumber}>{countdown}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
