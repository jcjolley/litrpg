# Hidden Books List

## Overview
Add a panel allowing users to view and manage books they've hidden ("not interested"). Currently, hidden books disappear permanently with no way to recover them.

## Problem Statement
When users click "Ignore" or "Not Interested" on a book, it's hidden forever from their carousel with no undo mechanism. Users may:
1. Accidentally hide a book they meant to wishlist
2. Change their mind about a book after initially dismissing it
3. Want to review what books they've hidden to refine their preferences

## Goals
- [ ] Add "Hidden Books" panel showing all not-interested books
- [ ] Allow users to unhide individual books
- [ ] Allow bulk clear of hidden list
- [ ] Show count of hidden books in accessible location

## Non-Goals
- Not adding "recently hidden" undo toast (could be future enhancement)
- Not categorizing hidden books by reason
- Not syncing hidden books across devices (localStorage only)

---

## User Stories

### US-001: View Hidden Books
**As a** user who has hidden books
**I want** to see a list of books I've hidden
**So that** I can review my decisions

**Acceptance Criteria:**
- [ ] "Hidden Books" panel accessible from Settings or My Books panel
- [ ] Shows book title, author, and cover thumbnail
- [ ] Shows total count of hidden books
- [ ] Empty state when no books are hidden
- [ ] Sorted by most recently hidden first

### US-002: Unhide Individual Book
**As a** user who accidentally hid a book
**I want** to unhide it
**So that** it appears in my carousel again

**Acceptance Criteria:**
- [ ] Each book row has "Unhide" button
- [ ] Clicking Unhide removes book from hidden list
- [ ] Book immediately becomes eligible for carousel
- [ ] Count updates after unhiding
- [ ] Optional: Brief confirmation toast

### US-003: Clear All Hidden Books
**As a** user who wants a fresh start
**I want** to unhide all books at once
**So that** I can re-evaluate everything

**Acceptance Criteria:**
- [ ] "Clear All" button in panel header
- [ ] Confirmation dialog before clearing
- [ ] All hidden books become visible in carousel
- [ ] Panel closes or shows empty state

---

## Phases

### Phase 1: Hidden Books Panel Component
Create the panel UI following WishlistPanel pattern.

#### 1.1 Create Component Files
**Files to create:**
- `ui/src/components/HiddenBooksPanel/HiddenBooksPanel.tsx`
- `ui/src/components/HiddenBooksPanel/HiddenBooksPanel.module.css`

#### 1.2 Component Structure
**File:** `ui/src/components/HiddenBooksPanel/HiddenBooksPanel.tsx`

```typescript
import { useMemo, useState } from 'react';
import type { Book } from '../../types/book';
import styles from './HiddenBooksPanel.module.css';

interface HiddenBooksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  hiddenBookIds: string[];
  books: Book[];
  onUnhide: (bookId: string) => void;
  onClearAll: () => void;
}

export function HiddenBooksPanel({
  isOpen,
  onClose,
  hiddenBookIds,
  books,
  onUnhide,
  onClearAll,
}: HiddenBooksPanelProps) {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Get full book data for hidden items
  const hiddenBooks = useMemo(() => {
    return hiddenBookIds
      .map((id) => books.find((b) => b.id === id))
      .filter((b): b is Book => b !== undefined)
      .reverse(); // Most recently hidden first
  }, [hiddenBookIds, books]);

  const handleClearAll = () => {
    onClearAll();
    setShowConfirmClear(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>HIDDEN BOOKS</h2>
          <span className={styles.count}>[{hiddenBookIds.length}]</span>
          <button className={styles.closeButton} onClick={onClose} type="button">
            X
          </button>
        </div>

        {/* Clear All Confirmation */}
        {showConfirmClear && (
          <div className={styles.confirmBar}>
            <span>Unhide all {hiddenBookIds.length} books?</span>
            <button onClick={handleClearAll} className={styles.confirmYes}>YES</button>
            <button onClick={() => setShowConfirmClear(false)} className={styles.confirmNo}>NO</button>
          </div>
        )}

        {/* Book List */}
        <div className={styles.bookList}>
          {hiddenBooks.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>&#128683;</span>
              <p className={styles.emptyText}>No hidden books</p>
              <p className={styles.emptyHint}>Books you dismiss will appear here</p>
            </div>
          ) : (
            hiddenBooks.map((book) => (
              <div key={book.id} className={styles.bookRow}>
                <img
                  src={book.imageUrl}
                  alt={book.title}
                  className={styles.bookCover}
                />
                <div className={styles.bookInfo}>
                  <span className={styles.bookTitle}>{book.title}</span>
                  <span className={styles.bookAuthor}>{book.author}</span>
                </div>
                <button
                  className={styles.unhideButton}
                  onClick={() => onUnhide(book.id)}
                  type="button"
                  title="Unhide book"
                >
                  &#8635; UNHIDE
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {hiddenBooks.length > 0 && !showConfirmClear && (
          <div className={styles.footer}>
            <button
              className={styles.clearAllButton}
              onClick={() => setShowConfirmClear(true)}
              type="button"
            >
              CLEAR ALL HIDDEN
            </button>
          </div>
        )}
      </div>
    </>
  );
}
```

#### 1.3 Component Styles
**File:** `ui/src/components/HiddenBooksPanel/HiddenBooksPanel.module.css`

Based on WishlistPanel.module.css pattern:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1100;
}

.panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(90vw, 500px);
  max-height: 80vh;
  background: linear-gradient(180deg, var(--ff-blue-mid) 0%, var(--ff-blue-dark) 100%);
  border: 3px solid var(--ff-border-outer);
  border-radius: 8px;
  box-shadow: inset 0 0 0 2px var(--ff-border-inner);
  display: flex;
  flex-direction: column;
  z-index: 1101;
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 2px solid var(--ff-border-outer);
}

.title {
  font-size: 14px;
  color: var(--ff-text-highlight);
  margin: 0;
}

.count {
  font-size: 10px;
  color: var(--ff-text-secondary);
  margin-left: 8px;
}

.closeButton {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--ff-text-highlight);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
}

.bookList {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.bookRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-bottom: 1px solid var(--ff-border-inner);
}

.bookCover {
  width: 40px;
  height: 60px;
  object-fit: cover;
  border-radius: 2px;
}

.bookInfo {
  flex: 1;
  min-width: 0;
}

.bookTitle {
  display: block;
  font-size: 10px;
  color: var(--ff-text-highlight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookAuthor {
  display: block;
  font-size: 8px;
  color: var(--ff-text-secondary);
}

.unhideButton {
  background: linear-gradient(180deg, var(--ff-blue-light) 0%, var(--ff-blue-mid) 100%);
  border: 2px solid var(--ff-border-outer);
  border-radius: 4px;
  color: var(--ff-text-highlight);
  font-size: 8px;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.unhideButton:hover {
  background: linear-gradient(180deg, #4060d0 0%, var(--ff-blue-light) 100%);
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.emptyIcon {
  font-size: 48px;
  margin-bottom: 16px;
}

.emptyText {
  font-size: 12px;
  color: var(--ff-text-highlight);
  margin-bottom: 8px;
}

.emptyHint {
  font-size: 8px;
  color: var(--ff-text-secondary);
}

.footer {
  padding: 12px 16px;
  border-top: 2px solid var(--ff-border-outer);
  display: flex;
  justify-content: center;
}

.clearAllButton {
  background: linear-gradient(180deg, #803030 0%, #602020 100%);
  border: 2px solid var(--ff-border-outer);
  border-radius: 4px;
  color: var(--ff-text-highlight);
  font-size: 10px;
  padding: 8px 16px;
  cursor: pointer;
}

.clearAllButton:hover {
  background: linear-gradient(180deg, #904040 0%, #803030 100%);
}

.confirmBar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px;
  background: #604020;
  font-size: 10px;
}

.confirmYes {
  background: #306030;
  border: 1px solid #408040;
  color: white;
  padding: 4px 12px;
  cursor: pointer;
}

.confirmNo {
  background: #603030;
  border: 1px solid #804040;
  color: white;
  padding: 4px 12px;
  cursor: pointer;
}
```

### Phase 2: Integration into App
Wire the panel into the app state.

#### 2.1 Add Panel State
**File:** `ui/src/App.tsx`

Add to imports:
```typescript
import { HiddenBooksPanel } from './components/HiddenBooksPanel';
```

Add state:
```typescript
const [showHiddenBooksPanel, setShowHiddenBooksPanel] = useState(false);
```

#### 2.2 Add Panel Render
**File:** `ui/src/App.tsx`

Add in render, near other panels:
```tsx
<HiddenBooksPanel
  isOpen={showHiddenBooksPanel}
  onClose={() => setShowHiddenBooksPanel(false)}
  hiddenBookIds={notInterestedIds}
  books={allBooks}
  onUnhide={removeNotInterested}
  onClearAll={clearNotInterested}
/>
```

### Phase 3: Access Point
Add entry point to open Hidden Books panel.

#### 3.1 Add to Settings Panel
**File:** `ui/src/components/SettingsPanel/SettingsPanel.tsx`

Add a button/link to open Hidden Books:
```tsx
<button
  className={styles.settingsLink}
  onClick={() => {
    onClose();
    onShowHiddenBooks();
  }}
>
  MANAGE HIDDEN BOOKS [{hiddenCount}]
</button>
```

Update props:
```typescript
interface SettingsPanelProps {
  // ...existing props
  hiddenCount: number;
  onShowHiddenBooks: () => void;
}
```

#### 3.2 Alternative: Add to My Books Panel
**File:** `ui/src/components/HistoryPanel/HistoryPanel.tsx`

Add as third tab alongside "Seen" and "Completed":
```tsx
type TabType = 'seen' | 'completed' | 'hidden';

// In tabs section
<button
  className={`${styles.tab} ${activeTab === 'hidden' ? styles.activeTab : ''}`}
  onClick={() => setActiveTab('hidden')}
>
  HIDDEN [{hiddenCount}]
</button>
```

### Phase 4: Update Props Chain
Pass required props from App through to SettingsPanel or HistoryPanel.

#### 4.1 Update App.tsx
**File:** `ui/src/App.tsx`

```tsx
<SettingsPanel
  // ...existing props
  hiddenCount={notInterestedCount}
  onShowHiddenBooks={() => {
    setShowSettingsPanel(false);
    setShowHiddenBooksPanel(true);
  }}
/>
```

---

## Technical Specifications

### Data Model
Uses existing `useNotInterested` hook:
- `notInterestedIds: string[]` - Array of hidden book IDs
- `removeNotInterested(id)` - Unhide single book
- `clearNotInterested()` - Unhide all books
- `count: number` - Total hidden count

### LocalStorage Key
`litrpg-not-interested` - Array of book ID strings (existing)

### Book Lookup
Hidden book IDs are joined with `allBooks` to get full book details. Books that no longer exist in the catalog are filtered out.

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `ui/src/components/HiddenBooksPanel/HiddenBooksPanel.tsx` | Panel component |
| `ui/src/components/HiddenBooksPanel/HiddenBooksPanel.module.css` | Panel styles |

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/App.tsx` | Add panel state, render HiddenBooksPanel |
| `ui/src/components/SettingsPanel/SettingsPanel.tsx` | Add "Manage Hidden Books" link |
| (Alternative) `ui/src/components/HistoryPanel/HistoryPanel.tsx` | Add "Hidden" tab |

---

## Quality Gates

- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test` - All tests pass
- `npm run build` - Build succeeds

---

## Verification Checklist

### Panel Display
1. [ ] Hide 3+ books using "Ignore" action
2. [ ] Open Settings -> "Manage Hidden Books"
3. [ ] Panel shows all hidden books with covers
4. [ ] Count shows correct number
5. [ ] Most recently hidden book appears first

### Unhide Single Book
1. [ ] Click "UNHIDE" on a book
2. [ ] Book disappears from hidden list
3. [ ] Count decreases by 1
4. [ ] Spin carousel -> book can appear again

### Clear All
1. [ ] Click "CLEAR ALL HIDDEN"
2. [ ] Confirmation dialog appears
3. [ ] Click "YES" -> all books unhidden
4. [ ] Panel shows empty state
5. [ ] All previously hidden books can appear in carousel

### Empty State
1. [ ] Clear all hidden books
2. [ ] Open Hidden Books panel
3. [ ] Shows empty state message
4. [ ] No errors in console

---

## Implementation Order

1. Create HiddenBooksPanel.tsx with basic structure
2. Create HiddenBooksPanel.module.css (copy from WishlistPanel)
3. Add panel state and render in App.tsx
4. Wire up props (hiddenBookIds, onUnhide, onClearAll)
5. Add "Manage Hidden Books" link to SettingsPanel
6. Update SettingsPanel props interface
7. Pass hiddenCount to SettingsPanel
8. Test all verification items

---

## Open Questions

- [ ] Add to Settings vs add as tab in My Books/HistoryPanel?
- [ ] Show undo toast after hiding a book? (future enhancement)
- [ ] Add "Hide All From Series" option when hiding?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users hide many books, slow panel | Low | Virtual list if >100 books |
| Book data not found for old hidden IDs | Low | Filter out missing books silently |
