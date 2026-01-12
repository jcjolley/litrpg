import { useState, useCallback } from 'react';
import { Carousel } from './components/Carousel';
import { useBooks } from './hooks/useBooks';
import { useWishlist } from './hooks/useWishlist';
import { recordImpression, recordClick, recordWishlist, recordNotInterested } from './api/books';
import type { Book } from './types/book';

export default function App() {
  const { books, loading, error } = useBooks();
  const { wishlist, addToWishlist } = useWishlist();

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [triggerSpin, setTriggerSpin] = useState(false);

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
      />
    </div>
  );
}
