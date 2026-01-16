import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { SettingsPanel } from './components/SettingsPanel';
import { AnnouncementsButton } from './components/AnnouncementsButton';
import { AnnouncementsPanel } from './components/AnnouncementsPanel';
import { ThemeProvider } from './contexts/ThemeContext';
import { useBooks } from './hooks/useBooks';
import { useWishlist } from './hooks/useWishlist';
import { useNotInterested } from './hooks/useNotInterested';
import { useHistory } from './hooks/useHistory';
import { useCompleted } from './hooks/useCompleted';
import { useVotes, type VoteType } from './hooks/useVotes';
import { useSettings } from './hooks/useSettings';
import { useAchievements, ACHIEVEMENTS, type Achievement } from './hooks/useAchievements';
import { useAchievementEffects } from './hooks/useAchievementEffects';
import { useAnnouncements } from './hooks/useAnnouncements';
import { recordImpression, recordClick, recordWishlist, recordNotInterested, recordUpvote, recordDownvote } from './api/books';
import { getAffiliateUrl } from './config';
import type { Book } from './types/book';

type OnboardingPhase = 'initial' | 'snarky';

export default function App() {
  // Achievement system - must be first as other hooks depend on effects
  const { unlock, trackGenreExplored, unlockedAchievements, trackSpin, pendingCompletionist, consumeCompletionist, stats } = useAchievements();
  const achievementEffects = useAchievementEffects(unlockedAchievements);

  // Data hooks
  const { books, allBooks, seriesMap, loading, error, filters, setFilters } = useBooks();
  const { wishlist, addToWishlist, removeFromWishlist, count: wishlistCount } = useWishlist();
  const { notInterestedIds, addNotInterested, count: notInterestedCount } = useNotInterested();
  const { history, addToHistory, clearHistory } = useHistory();
  const { completed, addCompleted, clearCompleted, isCompleted, count: completedCount } = useCompleted();
  const { votes, getVote, setVote } = useVotes();
  const { settings, updateSettings } = useSettings();
  const {
    announcements,
    isLoading: announcementsLoading,
    unreadCount,
    readCount: announcementsReadCount,
    markAllRead,
    getVote: getAnnouncementVote,
    vote: voteAnnouncement,
  } = useAnnouncements();

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
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showAnnouncementsPanel, setShowAnnouncementsPanel] = useState(false);

  // Get seen book IDs from history
  const seenBookIds = useMemo(() => new Set(history.map((h) => h.bookId)), [history]);

  // Filter out not-interested books (always) and optionally seen/completed based on settings
  // Wishlisted books are never filtered out by the "seen" filter
  const filteredBooks = useMemo(() => {
    let result = books.filter((book) => !notInterestedIds.includes(book.id));

    if (settings.hideCompletedBooks) {
      result = result.filter((book) => !completed.some((entry) => entry.bookId === book.id));
    }

    if (settings.hideSeenBooks) {
      // Don't filter out wishlisted books even if seen
      result = result.filter((book) => !seenBookIds.has(book.id) || wishlist.includes(book.id));
    }

    return result;
  }, [books, notInterestedIds, completed, seenBookIds, wishlist, settings]);

  // Konami code detection: ↑ ↑ ↓ ↓ ← → ← → B A
  const konamiSequence = useRef<string[]>([]);
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Add the key to the sequence
      konamiSequence.current.push(e.code);

      // Keep only the last N keys (length of Konami code)
      if (konamiSequence.current.length > KONAMI_CODE.length) {
        konamiSequence.current.shift();
      }

      // Check if the sequence matches
      if (konamiSequence.current.length === KONAMI_CODE.length &&
          konamiSequence.current.every((key, i) => key === KONAMI_CODE[i])) {
        // Reset the sequence
        konamiSequence.current = [];

        // Unlock the achievement
        const achievement = unlock('konami');
        if (achievement) {
          setCurrentAchievement(achievement);
          confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
            zIndex: 1000,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlock]);

  // Lydia easter egg detection
  const lydiaSequence = useRef<string[]>([]);
  const LYDIA_CODE = ['l', 'y', 'd', 'i', 'a'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only track letter keys
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        lydiaSequence.current.push(e.key.toLowerCase());

        // Keep only the last 5 characters
        if (lydiaSequence.current.length > LYDIA_CODE.length) {
          lydiaSequence.current.shift();
        }

        // Check if sequence matches "lydia"
        if (lydiaSequence.current.length === LYDIA_CODE.length &&
            lydiaSequence.current.every((key, i) => key === LYDIA_CODE[i])) {
          lydiaSequence.current = [];

          // Unlock achievement (only registers first time, but we always show confetti)
          unlock('lydia');

          // Always show the notification and confetti for Lydia
          setCurrentAchievement(ACHIEVEMENTS.lydia);
          confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#ff69b4', '#ff1493', '#ffb6c1', '#db7093', '#fff0f5'],
            zIndex: 1000,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlock]);

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

  const handleBookSelected = useCallback((book: Book) => {
    setSelectedBook(book);

    // Track spin for speedReader achievement
    const speedReaderAchievement = trackSpin();
    if (speedReaderAchievement) {
      showAchievementNotification(speedReaderAchievement);
    }

    // Record impression (fire and forget)
    recordImpression(book.id).catch((err) => {
      console.error('Failed to record impression:', err);
    });
  }, [trackSpin, showAchievementNotification]);

  const handleSpinStart = useCallback(() => {
    setSelectedBook(null);
    setTriggerSpin(false);
  }, []);

  const handleWishlist = useCallback(async () => {
    if (!selectedBook) return;

    // Mark as seen before moving on
    addToHistory(selectedBook.id);

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
  }, [selectedBook, addToHistory, addToWishlist, wishlistCount, unlock, showAchievementNotification]);

  const handleCompleted = useCallback(() => {
    if (!selectedBook) return;

    // Mark as seen before moving on
    addToHistory(selectedBook.id);

    addCompleted(selectedBook.id);

    // Check for completion achievements
    const newCount = completedCount + 1;
    if (newCount === 1) {
      showAchievementNotification(unlock('firstCompleted'));
    } else if (newCount === 5) {
      showAchievementNotification(unlock('completed5'));
    } else if (newCount === 10) {
      showAchievementNotification(unlock('completed10'));
    } else if (newCount === 20) {
      showAchievementNotification(unlock('completed20'));
    } else if (newCount === 50) {
      showAchievementNotification(unlock('completed50'));
    }

    // Spin again after marking complete
    setTriggerSpin(true);
  }, [selectedBook, addToHistory, addCompleted, completedCount, unlock, showAchievementNotification]);

  const handleSpinAgain = useCallback(() => {
    // Mark current book as seen before spinning again
    if (selectedBook) {
      addToHistory(selectedBook.id);
    }
    setTriggerSpin(true);
  }, [selectedBook, addToHistory]);

  const handleIgnore = useCallback(async () => {
    if (selectedBook) {
      // Mark as seen before moving on
      addToHistory(selectedBook.id);

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
  }, [selectedBook, addToHistory, addNotInterested, notInterestedCount, unlock, showAchievementNotification]);

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

  const handleVote = useCallback(async (bookId: string, vote: VoteType) => {
    const currentVote = getVote(bookId);

    // If clicking the same vote, do nothing (already voted)
    if (currentVote === vote) return;

    // Update local state
    setVote(bookId, vote);

    // Record the vote to the API
    try {
      if (vote === 'up') {
        await recordUpvote(bookId);
      } else {
        await recordDownvote(bookId);
      }
    } catch (err) {
      console.error('Failed to record vote:', err);
    }
  }, [getVote, setVote]);

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

  // Handle closing announcements panel - marks all as read and checks achievement
  const handleCloseAnnouncements = useCallback(() => {
    // Check if we'll hit 5 reads after marking all as read
    const willHaveRead = announcementsReadCount + unreadCount;
    const alreadyHasAchievement = unlockedAchievements.includes('townCrier');

    markAllRead();
    setShowAnnouncementsPanel(false);

    // Check for townCrier achievement (5 announcements read)
    if (!alreadyHasAchievement && willHaveRead >= 5) {
      showAchievementNotification(unlock('townCrier'));
    }
  }, [announcementsReadCount, unreadCount, unlockedAchievements, markAllRead, unlock, showAchievementNotification]);

  // Handle filter changes and track genre exploration
  const handleFiltersChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);

      // Track genre exploration for achievement (check for newly included genres)
      const includedGenres = Object.entries(newFilters.genre)
        .filter(([_, state]) => state === 'include')
        .map(([genre]) => genre);

      for (const genre of includedGenres) {
        const achievement = trackGenreExplored(genre);
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
          <AnnouncementsButton
            unreadCount={unreadCount}
            onClick={() => setShowAnnouncementsPanel(true)}
          />
          <button
            className="stats-button"
            onClick={() => setShowSettingsPanel(true)}
            disabled={showOnboarding}
            type="button"
            title="Settings"
          >
            <span role="img" aria-label="settings">&#9881;</span>
          </button>
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
            seriesMap={seriesMap}
            userWishlist={wishlist}
            userVotes={votes}
            onBookSelected={handleBookSelected}
            triggerSpin={triggerSpin}
            onSpinStart={handleSpinStart}
            onWishlist={handleWishlist}
            onCompleted={handleCompleted}
            onSpinAgain={handleSpinAgain}
            onIgnore={handleIgnore}
            onCoverClick={handleCoverClick}
            onVote={handleVote}
            selectedBookId={selectedBook?.id}
            isCompleted={selectedBook ? isCompleted(selectedBook.id) : false}
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
          books={allBooks}
          onRemove={removeFromWishlist}
          unlockedAchievements={unlockedAchievements}
        />

        <HistoryPanel
          isOpen={showHistoryPanel}
          onClose={() => setShowHistoryPanel(false)}
          history={history}
          completed={completed}
          books={allBooks}
          onClear={clearHistory}
          onClearCompleted={clearCompleted}
        />

        <StatsPanel
          isOpen={showStatsPanel}
          onClose={() => setShowStatsPanel(false)}
          unlockedAchievements={unlockedAchievements}
          stats={stats}
          wishlistCount={wishlistCount}
          notInterestedCount={notInterestedCount}
          announcementsReadCount={announcementsReadCount}
          onRemort={() => {
            setShowStatsPanel(false);
            setShowRemortDialog(true);
          }}
        />

        <AnnouncementsPanel
          isOpen={showAnnouncementsPanel}
          onClose={handleCloseAnnouncements}
          announcements={announcements}
          isLoading={announcementsLoading}
          getVote={getAnnouncementVote}
          onVote={voteAnnouncement}
        />

        <RemortDialog
          isOpen={showRemortDialog}
          onCancel={() => setShowRemortDialog(false)}
        />

        <PrivacyPolicy
          isOpen={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
        />

        <SettingsPanel
          isOpen={showSettingsPanel}
          onClose={() => setShowSettingsPanel(false)}
          settings={settings}
          onSettingsChange={updateSettings}
        />
      </div>
    </ThemeProvider>
  );
}
