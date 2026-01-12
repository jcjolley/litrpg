import { useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Carousel } from './components/Carousel';
import { OnboardingDialog } from './components/OnboardingDialog';
import { AchievementNotification } from './components/AchievementNotification';
import { useBooks } from './hooks/useBooks';
import { useWishlist } from './hooks/useWishlist';
import { recordImpression, recordClick, recordWishlist, recordNotInterested } from './api/books';
import type { Book } from './types/book';

type OnboardingPhase = 'initial' | 'snarky';

export default function App() {
  const { books, loading, error } = useBooks();
  const { wishlist, addToWishlist } = useWishlist();

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [triggerSpin, setTriggerSpin] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('initial');
  const [showAchievement, setShowAchievement] = useState(false);

  const handleBookSelected = useCallback(async (book: Book) => {
    setSelectedBook(book);

    // Record impression
    try {
      await recordImpression(book.id);
    } catch (err) {
      console.error('Failed to record impression:', err);
    }
  }, []);

  const handleSpinStart = useCallback(() => {
    setSelectedBook(null);
    setTriggerSpin(false);
  }, []);

  const handleWishlist = useCallback(async () => {
    if (!selectedBook) return;

    addToWishlist(selectedBook.id);

    try {
      await recordWishlist(selectedBook.id);
    } catch (err) {
      console.error('Failed to record wishlist:', err);
    }

    // Spin again after wishlisting
    setTriggerSpin(true);
  }, [selectedBook, addToWishlist]);

  const handleSpinAgain = useCallback(() => {
    setTriggerSpin(true);
  }, []);

  const handleIgnore = useCallback(async () => {
    if (selectedBook) {
      try {
        await recordNotInterested(selectedBook.id);
      } catch (err) {
        console.error('Failed to record not interested:', err);
      }
    }
    setTriggerSpin(true);
  }, [selectedBook]);

  const handleCoverClick = useCallback(async () => {
    if (!selectedBook) return;

    try {
      await recordClick(selectedBook.id);
    } catch (err) {
      console.error('Failed to record click:', err);
    }

    window.open(selectedBook.audibleUrl, '_blank');
  }, [selectedBook]);

  // Onboarding handlers
  const handleOnboardingYes = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingNo = useCallback(() => {
    // Fire confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f8e800', '#40c040', '#4080c0', '#c04040', '#ffffff'],
    });

    // Show achievement
    setShowAchievement(true);

    // Switch to snarky phase
    setOnboardingPhase('snarky');
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setShowOnboarding(false);
    setOnboardingPhase('initial');
  }, []);

  const handleAchievementDismiss = useCallback(() => {
    setShowAchievement(false);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading books...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-text">Failed to load books</div>
        <div className="error-detail">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Carousel
        books={books}
        userWishlist={wishlist}
        onBookSelected={handleBookSelected}
        triggerSpin={triggerSpin}
        onSpinStart={handleSpinStart}
        onWishlist={handleWishlist}
        onSpinAgain={handleSpinAgain}
        onIgnore={handleIgnore}
        onCoverClick={handleCoverClick}
        selectedBookId={selectedBook?.id}
        continuousSpin={showOnboarding}
      />

      <OnboardingDialog
        isOpen={showOnboarding}
        phase={onboardingPhase}
        onYes={handleOnboardingYes}
        onNo={handleOnboardingNo}
        onCountdownComplete={handleCountdownComplete}
      />

      <AchievementNotification
        title="ACHIEVEMENT UNLOCKED!"
        subtitle="The Contrarian"
        isVisible={showAchievement}
        onDismiss={handleAchievementDismiss}
        duration={6000}
      />
    </div>
  );
}
