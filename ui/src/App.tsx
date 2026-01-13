import { useState, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Carousel } from './components/Carousel';
import { OnboardingDialog } from './components/OnboardingDialog';
import { AchievementNotification } from './components/AchievementNotification';
import { FilterMenu } from './components/FilterMenu';
import { useBooks } from './hooks/useBooks';
import { useWishlist } from './hooks/useWishlist';
import { useNotInterested } from './hooks/useNotInterested';
import { useAchievements, type Achievement } from './hooks/useAchievements';
import { recordImpression, recordClick, recordWishlist, recordNotInterested } from './api/books';
import type { Book } from './types/book';

type OnboardingPhase = 'initial' | 'snarky';

export default function App() {
  const { books, loading, error, filters, setFilters } = useBooks();
  const { wishlist, addToWishlist, count: wishlistCount } = useWishlist();
  const { notInterestedIds, addNotInterested, count: notInterestedCount } = useNotInterested();
  const { unlock, trackGenreExplored } = useAchievements();

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [triggerSpin, setTriggerSpin] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('initial');
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Filter out not-interested books
  const filteredBooks = useMemo(
    () => books.filter((book) => !notInterestedIds.includes(book.id)),
    [books, notInterestedIds]
  );

  // Show achievement notification
  const showAchievementNotification = useCallback((achievement: Achievement | null) => {
    if (achievement) {
      setCurrentAchievement(achievement);
      // Fire confetti for any achievement
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f8e800', '#40c040', '#4080c0', '#c04040', '#ffffff'],
      });
    }
  }, []);

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

    // Check for wishlist achievements
    const newCount = wishlistCount + 1;
    if (newCount === 1) {
      showAchievementNotification(unlock('firstWishlist'));
    } else if (newCount === 5) {
      showAchievementNotification(unlock('wishlist5'));
    } else if (newCount === 10) {
      showAchievementNotification(unlock('wishlist10'));
    }

    // Spin again after wishlisting
    setTriggerSpin(true);
  }, [selectedBook, addToWishlist, wishlistCount, unlock, showAchievementNotification]);

  const handleSpinAgain = useCallback(() => {
    setTriggerSpin(true);
  }, []);

  const handleIgnore = useCallback(async () => {
    if (selectedBook) {
      addNotInterested(selectedBook.id);

      try {
        await recordNotInterested(selectedBook.id);
      } catch (err) {
        console.error('Failed to record not interested:', err);
      }

      // Check for picky achievement (10 books marked as not interested)
      const newCount = notInterestedCount + 1;
      if (newCount === 10) {
        showAchievementNotification(unlock('picky'));
      }
    }
    setTriggerSpin(true);
  }, [selectedBook, addNotInterested, notInterestedCount, unlock, showAchievementNotification]);

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
    // Unlock and show the contrarian achievement
    const achievement = unlock('contrarian');
    showAchievementNotification(achievement);

    // Switch to snarky phase
    setOnboardingPhase('snarky');
  }, [unlock, showAchievementNotification]);

  const handleCountdownComplete = useCallback(() => {
    setShowOnboarding(false);
    setOnboardingPhase('initial');
  }, []);

  const handleAchievementDismiss = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  // Handle filter changes and track genre exploration
  const handleFiltersChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);

      // Track genre exploration for achievement
      if (newFilters.genre) {
        const achievement = trackGenreExplored(newFilters.genre);
        if (achievement) {
          showAchievementNotification(achievement);
        }
      }
    },
    [setFilters, trackGenreExplored, showAchievementNotification]
  );

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
      <header className="header">
        <FilterMenu
          filters={filters}
          onFiltersChange={handleFiltersChange}
          disabled={showOnboarding}
        />
      </header>

      <main className="main">
        <Carousel
          books={filteredBooks}
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
      </main>

      <OnboardingDialog
        isOpen={showOnboarding}
        phase={onboardingPhase}
        onYes={handleOnboardingYes}
        onNo={handleOnboardingNo}
        onCountdownComplete={handleCountdownComplete}
      />

      <AchievementNotification
        title={currentAchievement?.title ?? ''}
        subtitle={currentAchievement?.subtitle ?? ''}
        description={currentAchievement?.description}
        isVisible={currentAchievement !== null}
        onDismiss={handleAchievementDismiss}
        duration={6000}
      />
    </div>
  );
}
