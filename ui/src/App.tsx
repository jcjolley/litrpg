import { useState, useCallback, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Carousel } from './components/Carousel';
import { OnboardingDialog } from './components/OnboardingDialog';
import { AchievementNotification } from './components/AchievementNotification';
import { FilterMenu } from './components/FilterMenu';
import { StatsPanel } from './components/StatsPanel';
import { WishlistPanel } from './components/WishlistPanel';
import { RemortDialog } from './components/RemortDialog';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { HistoryPanel } from './components/HistoryPanel';
import { ThemeProvider } from './contexts/ThemeContext';
import { useBooks } from './hooks/useBooks';
import { useWishlist } from './hooks/useWishlist';
import { useNotInterested } from './hooks/useNotInterested';
import { useHistory } from './hooks/useHistory';
import { useAchievements, type Achievement } from './hooks/useAchievements';
import { useAchievementEffects } from './hooks/useAchievementEffects';
import { recordImpression, recordClick, recordWishlist, recordNotInterested } from './api/books';
import { getAffiliateUrl } from './config';
import type { Book } from './types/book';

type OnboardingPhase = 'initial' | 'snarky';

export default function App() {
  // Achievement system - must be first as other hooks depend on effects
  const { unlock, trackGenreExplored, unlockedAchievements, trackSpin, pendingCompletionist, consumeCompletionist, stats } = useAchievements();
  const achievementEffects = useAchievementEffects(unlockedAchievements);

  // Data hooks
  const { books, loading, error, filters, setFilters } = useBooks({ bookLimit: achievementEffects.bookLimit });
  const { wishlist, addToWishlist, removeFromWishlist, count: wishlistCount } = useWishlist();
  const { notInterestedIds, addNotInterested, count: notInterestedCount } = useNotInterested();
  const { history, addToHistory, clearHistory } = useHistory();

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [triggerSpin, setTriggerSpin] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('initial');
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Panel and dialog state
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showWishlistPanel, setShowWishlistPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showRemortDialog, setShowRemortDialog] = useState(false);

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
        zIndex: 1000,
      });
    }
  }, []);

  const handleBookSelected = useCallback(async (book: Book) => {
    setSelectedBook(book);

    // Add to history
    addToHistory(book.id);

    // Track spin for speedReader achievement
    const speedReaderAchievement = trackSpin();
    if (speedReaderAchievement) {
      showAchievementNotification(speedReaderAchievement);
    }

    // Record impression
    try {
      await recordImpression(book.id);
    } catch (err) {
      console.error('Failed to record impression:', err);
    }
  }, [addToHistory, trackSpin, showAchievementNotification]);

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

    // Use appropriate URL based on book source
    const url = selectedBook.source === 'ROYAL_ROAD'
      ? selectedBook.royalRoadUrl
      : getAffiliateUrl(selectedBook.audibleUrl ?? '');

    if (url) {
      window.open(url, '_blank');
    }
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

  // Watch for completionist achievement (auto-unlocked when all others are obtained)
  useEffect(() => {
    if (pendingCompletionist) {
      showAchievementNotification(pendingCompletionist);
      consumeCompletionist();
    }
  }, [pendingCompletionist, showAchievementNotification, consumeCompletionist]);

  if (loading) {
    return (
      <ThemeProvider unlockedAchievements={unlockedAchievements}>
        <div className="loading-container">
          <div className="loading-text">Loading books...</div>
        </div>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider unlockedAchievements={unlockedAchievements}>
        <div className="error-container">
          <div className="error-text">Failed to load books</div>
          <div className="error-detail">{error.message}</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider unlockedAchievements={unlockedAchievements}>
      <div className="app">
        <header className="header">
          <button
            className="stats-button"
            onClick={() => setShowWishlistPanel(true)}
            disabled={showOnboarding}
            type="button"
            title="Wishlist"
          >
            <span role="img" aria-label="books">&#128218;</span>
          </button>
          <button
            className="stats-button"
            onClick={() => setShowHistoryPanel(true)}
            disabled={showOnboarding}
            type="button"
            title="Journal"
          >
            <span role="img" aria-label="journal">&#128220;</span>
          </button>
          <FilterMenu
            filters={filters}
            onFiltersChange={handleFiltersChange}
            disabled={showOnboarding}
          />
          <button
            className="stats-button"
            onClick={() => setShowPrivacyPolicy(true)}
            disabled={showOnboarding}
            type="button"
            title="Privacy & Disclosure"
          >
            <span role="img" aria-label="info">&#9432;</span>
          </button>
          <button
            className="stats-button"
            onClick={() => setShowStatsPanel(true)}
            disabled={showOnboarding}
            type="button"
            title="Reader Stats"
          >
            <span role="img" aria-label="trophy">&#127942;</span>
          </button>
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
            spinSpeedMultiplier={achievementEffects.spinSpeedMultiplier}
            hasGoldenBorder={achievementEffects.hasGoldenBorder}
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

        <WishlistPanel
          isOpen={showWishlistPanel}
          onClose={() => setShowWishlistPanel(false)}
          wishlistIds={wishlist}
          books={books}
          onRemove={removeFromWishlist}
          unlockedAchievements={unlockedAchievements}
        />

        <HistoryPanel
          isOpen={showHistoryPanel}
          onClose={() => setShowHistoryPanel(false)}
          history={history}
          books={books}
          onClear={clearHistory}
        />

        <StatsPanel
          isOpen={showStatsPanel}
          onClose={() => setShowStatsPanel(false)}
          unlockedAchievements={unlockedAchievements}
          stats={stats}
          wishlistCount={wishlistCount}
          notInterestedCount={notInterestedCount}
          onRemort={() => {
            setShowStatsPanel(false);
            setShowRemortDialog(true);
          }}
        />

        <RemortDialog
          isOpen={showRemortDialog}
          onCancel={() => setShowRemortDialog(false)}
        />

        <PrivacyPolicy
          isOpen={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
        />
      </div>
    </ThemeProvider>
  );
}
