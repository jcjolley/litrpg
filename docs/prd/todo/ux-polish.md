# UX Polish

## Overview
Address usability issues affecting mobile users, keyboard users, and users with cognitive overload from icon-only buttons. Improves touch targets, keyboard navigation, and header organization.

## Problem Statement
Current UX issues impacting user experience:
1. **Header cognitive load** - 7 emoji-only buttons with no labels or grouping
2. **Mobile touch targets** - Buttons can shrink to 36px, below 44px minimum
3. **Keyboard navigation gaps** - Cannot Tab through filter options, no focus indicators on vote buttons
4. **Confusing terminology** - "JOURNAL" label doesn't clearly communicate it's about reading history

## Goals
- [ ] Reorganize header with logical grouping and optional text labels
- [ ] Enforce 44px minimum touch targets on mobile
- [ ] Add keyboard navigation to filter options
- [ ] Rename "JOURNAL" to "MY BOOKS" for clarity
- [ ] Add ARIA live regions for dynamic content updates

## Non-Goals
- Not redesigning the entire header layout
- Not adding full WCAG 2.1 AA compliance (partial improvements only)
- Not changing color contrast ratios
- Not adding skip links or landmark navigation

---

## User Stories

### US-001: Mobile-Friendly Touch Targets
**As a** mobile user
**I want** buttons large enough to tap accurately
**So that** I don't accidentally tap the wrong button

**Acceptance Criteria:**
- [ ] All header buttons minimum 44x44px on viewports < 768px
- [ ] Button spacing at least 8px to prevent accidental taps
- [ ] Touch targets include padding around icons
- [ ] Test on actual mobile device confirms easy tapping

### US-002: Reduced Header Cognitive Load
**As a** new user
**I want** to understand what each header button does
**So that** I can find features without trial-and-error

**Acceptance Criteria:**
- [ ] Buttons grouped logically: [Library: Wishlist, My Books] [Discovery: Filters] [Settings: gear, info, stats]
- [ ] On desktop (>768px), show text labels below icons
- [ ] On mobile (<768px), show icons only with clear tooltips
- [ ] Less-used buttons (Privacy, Stats) moved to settings submenu or bottom position

### US-003: Keyboard Navigation for Filters
**As a** keyboard user
**I want** to navigate filter options with Tab/Enter
**So that** I can use the app without a mouse

**Acceptance Criteria:**
- [ ] Tab key moves through filter category rows
- [ ] Enter/Space key activates selected row
- [ ] Arrow keys navigate within options
- [ ] Focus visible indicator on all interactive elements
- [ ] Escape key closes filter panel

### US-004: Rename Journal to My Books
**As a** user
**I want** clear labels for navigation
**So that** I understand what each section contains

**Acceptance Criteria:**
- [ ] Header button tooltip changes from "Journal" to "My Books"
- [ ] HistoryPanel title changes from "JOURNAL" to "MY BOOKS"
- [ ] Clear buttons change from "CLEAR JOURNAL" to "CLEAR HISTORY"
- [ ] All references updated consistently

### US-005: ARIA Live Regions
**As a** screen reader user
**I want** to hear dynamic content updates
**So that** I know when the carousel spins or filters apply

**Acceptance Criteria:**
- [ ] Carousel spin completion announced
- [ ] Filter changes announce book count
- [ ] Wishlist add/remove announced
- [ ] Achievement unlocks announced

---

## Phases

### Phase 1: Touch Target Improvements
Ensure minimum 44px touch targets.

#### 1.1 Update Button Sizing
**File:** `ui/src/index.css`

```css
.stats-button {
  /* Current: clamp(36px, 8%, 48px) */
  /* Updated: min 44px for touch accessibility */
  width: clamp(44px, 10%, 52px);
  height: clamp(44px, 10%, 52px);
  min-width: 44px;
  min-height: 44px;
  /* ... rest of styles */
}

/* Mobile-specific: ensure adequate spacing */
@media (max-width: 768px) {
  .header {
    gap: 8px; /* Minimum 8px between buttons */
  }

  .stats-button {
    width: 44px;
    height: 44px;
  }
}
```

#### 1.2 Add Touch-Friendly Padding
**File:** `ui/src/index.css`

```css
/* Increase tap area beyond visible button */
.stats-button::before {
  content: '';
  position: absolute;
  inset: -4px; /* Extends tap area by 4px on all sides */
}
```

### Phase 2: Header Reorganization
Group buttons logically and add labels on desktop.

#### 2.1 Create Button Groups
**File:** `ui/src/App.tsx`

Restructure header:
```tsx
<header className="header">
  {/* Library Group */}
  <div className="header-group" role="group" aria-label="Library">
    <button className="stats-button" title="Wishlist">
      <span className="button-icon">📚</span>
      <span className="button-label">Wishlist</span>
    </button>
    <button className="stats-button" title="My Books">
      <span className="button-icon">📜</span>
      <span className="button-label">My Books</span>
    </button>
  </div>

  {/* Filter (central focus) */}
  <FilterMenu ... />

  {/* Settings Group */}
  <div className="header-group" role="group" aria-label="Settings">
    <AnnouncementsButton ... />
    <button className="stats-button" title="Settings">
      <span className="button-icon">⚙</span>
      <span className="button-label">Settings</span>
    </button>
  </div>
</header>
```

#### 2.2 Add Button Label Styles
**File:** `ui/src/index.css`

```css
.header-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.button-icon {
  font-size: clamp(14px, 3vw, 18px);
}

.button-label {
  font-size: 8px;
  display: none; /* Hidden by default */
}

/* Show labels on larger screens */
@media (min-width: 900px) {
  .stats-button {
    flex-direction: column;
    padding: 4px 8px;
    width: auto;
    min-width: 60px;
  }

  .button-label {
    display: block;
    margin-top: 2px;
  }
}
```

#### 2.3 Move Less-Used Buttons
**File:** `ui/src/App.tsx`

Move Privacy & Stats into Settings panel or into a "More" dropdown:
- Keep in header: Wishlist, My Books, Filters, Announcements, Settings
- Move to Settings panel: Privacy Policy, Reader Stats
- Alternative: Add overflow menu for less-used items

### Phase 3: Keyboard Navigation for Filters
Add full keyboard support to FilterMenu.

#### 3.1 Add Keyboard Handler
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

```typescript
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  const rows: FilterRow[] = ['source', 'series', 'author', 'narrator', 'genre', 'length', 'discovery'];
  const currentIndex = rows.indexOf(activeRow);

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setActiveRow(rows[Math.min(currentIndex + 1, rows.length - 1)]);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setActiveRow(rows[Math.max(currentIndex - 1, 0)]);
      break;
    case 'Escape':
      e.preventDefault();
      setIsExpanded(false);
      break;
  }
}, [activeRow]);
```

#### 3.2 Add Tab Index to Options
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

```tsx
{GENRES.map((genre, index) => (
  <button
    key={genre.value}
    className={getOptionClass('genre', genre.value)}
    onClick={() => handleOptionClick('genre', genre.value)}
    tabIndex={activeRow === 'genre' ? 0 : -1}
    role="option"
    aria-selected={filters.genre[genre.value] === 'include'}
  >
    {getOptionLabel('genre', genre.value, genre.label)}
  </button>
))}
```

#### 3.3 Add Focus Trap
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

When panel is expanded, trap focus within panel until Escape or Close is pressed.

```typescript
useEffect(() => {
  if (!isExpanded) return;

  const panel = panelRef.current;
  if (!panel) return;

  // Focus first focusable element
  const firstFocusable = panel.querySelector('button, [tabindex="0"]') as HTMLElement;
  firstFocusable?.focus();

  // Trap focus within panel
  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusables = panel.querySelectorAll('button, [tabindex="0"]');
    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  window.addEventListener('keydown', handleTab);
  return () => window.removeEventListener('keydown', handleTab);
}, [isExpanded]);
```

### Phase 4: Rename Journal to My Books
Update all references.

#### 4.1 Update Header Button
**File:** `ui/src/App.tsx`

```tsx
<button
  className="stats-button"
  onClick={() => setShowHistoryPanel(true)}
  disabled={showOnboarding}
  type="button"
  title="My Books"  // Changed from "Journal"
>
  <span role="img" aria-label="my books">&#128220;</span>
</button>
```

#### 4.2 Update HistoryPanel Title
**File:** `ui/src/components/HistoryPanel/HistoryPanel.tsx`

```tsx
<h2 className={styles.title}>MY BOOKS</h2>  // Changed from "JOURNAL"

// Also update clear button
{activeTab === 'seen' ? 'CLEAR HISTORY' : 'CLEAR COMPLETED'}  // Changed from "CLEAR JOURNAL"
```

### Phase 5: ARIA Live Regions
Add screen reader announcements.

#### 5.1 Create Announcer Component
**File:** `ui/src/components/ScreenReaderAnnouncer/ScreenReaderAnnouncer.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react';

interface Props {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export function ScreenReaderAnnouncer({ message, politeness = 'polite' }: Props) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (message) {
      setAnnouncement(message);
      // Clear after announcement to allow repeat announcements
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
```

#### 5.2 Add SR-Only Style
**File:** `ui/src/index.css`

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

#### 5.3 Integrate Announcements
**File:** `ui/src/App.tsx`

```tsx
const [srMessage, setSrMessage] = useState('');

// On spin complete
const handleSpinComplete = useCallback((book: Book) => {
  setSrMessage(`Spinning stopped on ${book.title} by ${book.author}`);
}, []);

// On filter change
useEffect(() => {
  if (books.length > 0) {
    setSrMessage(`${books.length} books match your filters`);
  }
}, [books.length]);

// In render
<ScreenReaderAnnouncer message={srMessage} />
```

---

## Technical Specifications

### Touch Target Standards
- Minimum size: 44x44px (WCAG 2.1 AA Target Size)
- Minimum spacing: 8px between adjacent targets
- Touch area can extend beyond visual bounds

### Keyboard Navigation Requirements
- Tab: Move between interactive elements
- Arrow keys: Navigate within components
- Enter/Space: Activate focused element
- Escape: Close modals/dropdowns

### ARIA Roles
- `role="group"` for header button groups
- `role="option"` for filter options
- `aria-live="polite"` for status updates
- `aria-expanded` for filter panel

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `ui/src/components/ScreenReaderAnnouncer/ScreenReaderAnnouncer.tsx` | SR announcement component |
| `ui/src/components/ScreenReaderAnnouncer/ScreenReaderAnnouncer.module.css` | SR-only styles |

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/index.css` | Touch targets, button labels, sr-only class |
| `ui/src/App.tsx` | Header grouping, SR announcer, rename Journal |
| `ui/src/components/FilterMenu/FilterMenu.tsx` | Keyboard navigation, ARIA attributes |
| `ui/src/components/HistoryPanel/HistoryPanel.tsx` | Rename JOURNAL to MY BOOKS |

---

## Quality Gates

- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test` - All tests pass
- Manual keyboard navigation test passes
- Mobile touch target test (Chrome DevTools) passes

---

## Verification Checklist

### Touch Targets
1. [ ] Open Chrome DevTools -> Device toolbar -> Mobile view
2. [ ] All header buttons >= 44x44px visible
3. [ ] Tap each button on actual mobile device
4. [ ] No accidental adjacent button taps

### Header Organization
1. [ ] Desktop (>900px): Button labels visible below icons
2. [ ] Mobile (<768px): Icons only, adequate spacing
3. [ ] Button groups have visual/spatial separation
4. [ ] Tooltips show on hover for all buttons

### Keyboard Navigation
1. [ ] Tab through header buttons in logical order
2. [ ] Open filter panel with Enter
3. [ ] Arrow Down moves to next filter category
4. [ ] Tab moves through filter options
5. [ ] Escape closes filter panel
6. [ ] Focus returns to trigger button

### Journal -> My Books
1. [ ] Header button tooltip says "My Books"
2. [ ] Panel title says "MY BOOKS"
3. [ ] Clear button says "CLEAR HISTORY" / "CLEAR COMPLETED"

### Screen Reader
1. [ ] Enable VoiceOver/NVDA
2. [ ] Spin carousel -> hear book title announced
3. [ ] Change filter -> hear book count announced
4. [ ] Add to wishlist -> hear confirmation

---

## Implementation Order

1. Update `.stats-button` sizing in index.css (44px minimum)
2. Add mobile media query for header spacing
3. Rename Journal to My Books (App.tsx, HistoryPanel.tsx)
4. Add `.sr-only` class to index.css
5. Create ScreenReaderAnnouncer component
6. Add keyboard handler to FilterMenu
7. Add tabIndex and ARIA attributes to filter options
8. Add header button groups with roles
9. Add button labels for desktop view
10. Integrate SR announcer in App.tsx
11. Test all verification items

---

## Open Questions

- [ ] Should Privacy/Stats move to Settings panel or stay in header?
- [ ] Add visible text labels on mobile with overflow menu?
- [ ] Full focus trap for filter panel or simpler Escape-to-close?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Header overflow on small screens | Medium | Use overflow menu for extra buttons |
| Keyboard navigation complexity | Low | Start with basic Tab support, enhance incrementally |
| SR announcements too verbose | Low | Keep messages short, use polite mode |
