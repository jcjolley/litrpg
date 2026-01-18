# Background Book Loading

## Overview
Improve perceived page load performance by showing the onboarding dialog immediately while loading books in the background. The onboarding interaction gives the app time to fetch books, eliminating the "Loading books..." screen for most users.

## Problem Statement
As the book catalog grows, initial page load takes longer. Currently, users see a "Loading books..." screen that blocks the onboarding dialog. This creates unnecessary wait time and a poor first impression, even though the onboarding interaction itself provides natural loading time.

## Goals
- [ ] Show onboarding dialog immediately on page load (no blocking)
- [ ] Load books in background while user reads/interacts with onboarding
- [ ] Only show loading screen if user dismisses onboarding before books are ready
- [ ] Seamlessly transition to carousel once books are available

## Non-Goals
- Not changing the onboarding dialog content or flow
- Not modifying the book API or backend
- Not implementing service workers or PWA features
- Not adding offline-first capabilities

---

## User Stories

### US-001: Instant Onboarding
**As a** user
**I want** to see the onboarding dialog immediately
**So that** I don't wait for a loading screen before interacting with the app

**Acceptance Criteria:**
- [ ] Given page loads, then onboarding dialog appears immediately (no loading screen first)
- [ ] Given books are loading in background, when onboarding is visible, then carousel spins continuously behind it
- [ ] The "Loading books..." screen is never shown while onboarding is visible

### US-002: Graceful Transition After Onboarding
**As a** user who dismisses the onboarding dialog
**I want** the carousel to be ready
**So that** I can start exploring books immediately

**Acceptance Criteria:**
- [ ] Given books finished loading, when user dismisses onboarding, then carousel displays books immediately
- [ ] Given books are still loading, when user dismisses onboarding, then show loading screen until ready
- [ ] Given books fail to load, when user dismisses onboarding, then show error with retry option

### US-003: Background Loading with Cache
**As a** returning user with cached books
**I want** the app to use cached data while fetching updates
**So that** I never wait for the loading screen

**Acceptance Criteria:**
- [ ] Given cached books exist, when page loads, then carousel uses cached books immediately
- [ ] Given cached books exist, when background fetch completes, then new books are added seamlessly
- [ ] Given cached books exist, when user dismisses onboarding, then carousel is always ready (no loading screen)

---

## Phases

### Phase 1: Show Onboarding Immediately

Remove the loading screen gate that blocks the initial render.

#### 1.1 Track Ready State Separately
**File:** `ui/src/hooks/useBooks.ts`

Add `isReady` to distinguish "has displayable books" from "is actively fetching":

```typescript
interface UseBooksResult {
  books: Book[];
  allBooks: Book[];
  seriesMap: Map<string, Book[]>;
  loading: boolean;    // True while actively fetching
  isReady: boolean;    // True if we have books to display (cached or fetched)
  error: Error | null;
  filters: BookFilters;
  setFilters: (filters: BookFilters) => void;
  refetch: () => Promise<void>;
}
```

Implementation:
```typescript
const [allBooks, setAllBooks] = useState<Book[]>(loadCachedBooks);
// Ready when we have any books (from cache or fetch)
const isReady = allBooks.length > 0;
```

#### 1.2 Update App Render Logic
**File:** `ui/src/App.tsx`

Change from blocking on `loading` to blocking on `!isReady && !showOnboarding`:

```typescript
// Before:
if (loading) {
  return <div>Loading books...</div>;
}

// After:
// Only show loading screen if:
// 1. Books aren't ready yet, AND
// 2. User has already dismissed onboarding
if (!isReady && !showOnboarding) {
  return (
    <div className="loading-container">
      <div className="loading-text">Loading books...</div>
    </div>
  );
}
```

This ensures:
- Onboarding always shows immediately
- Loading screen only appears if user is faster than the fetch
- Cached books mean loading screen is never shown

### Phase 2: Handle Edge Cases

#### 2.1 Error State After Onboarding
**File:** `ui/src/App.tsx`

Update error handling to only show after onboarding is dismissed:

```typescript
// Only show error if user has dismissed onboarding and we have no books
if (error && !isReady && !showOnboarding) {
  return (
    <div className="error-container">
      <div className="error-text">Failed to load books</div>
      <div className="error-detail">{error.message}</div>
      <button onClick={refetch}>Retry</button>
    </div>
  );
}
```

#### 2.2 Verify Carousel Behavior
**File:** `ui/src/App.tsx`

Ensure carousel handles empty `carouselBooks` gracefully during the brief window before books load:

- Carousel already has `continuousSpin={showOnboarding}` which keeps it spinning
- Verify it doesn't error with empty books array
- Books will populate as soon as fetch completes

---

## Technical Specifications

### State Flow
```
Page Load
    ↓
useState(loadCachedBooks) → allBooks initialized
    ↓
isReady = allBooks.length > 0
    ↓
┌─────────────────────────────────────────┐
│ Render immediately:                     │
│   - OnboardingDialog (showOnboarding)   │
│   - Carousel (may be empty briefly)     │
│   - Header buttons (disabled)           │
└─────────────────────────────────────────┘
    ↓
useEffect triggers fetchBooks() in background
    ↓
loading = true
    ↓
API response received → allBooks updated → isReady = true
    ↓
loading = false
    ↓
User dismisses onboarding
    ↓
┌─────────────────────────────────────────┐
│ isReady?                                │
│   YES → Show full app with carousel     │
│   NO  → Show "Loading books..." screen  │
└─────────────────────────────────────────┘
```

### Timing Assumptions
- Onboarding takes ~2-4 seconds (reading + clicking)
- Book fetch takes ~1-3 seconds (typical)
- Cached books load instantly (synchronous localStorage)
- Most users will never see loading screen after onboarding

---

## Files Summary

### Files to Create
None

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/hooks/useBooks.ts` | Add `isReady` boolean to return value |
| `ui/src/App.tsx` | Update loading/error screen conditions to check `!showOnboarding` |

---

## Quality Gates

- `make typecheck-ui` - Type checking passes
- `make test-ui` - All tests pass
- `make build-ui` - Build succeeds

---

## Verification Checklist

1. [ ] Fresh load (no cache): Onboarding appears immediately, no loading screen
2. [ ] Fresh load, dismiss onboarding quickly: Loading screen shown briefly, then carousel
3. [ ] Fresh load, wait 3+ seconds, dismiss onboarding: Carousel ready immediately
4. [ ] Cached books: Onboarding appears, dismiss → carousel ready (never see loading)
5. [ ] Network error with cache: App works with cached books
6. [ ] Network error without cache: Error screen with retry (after onboarding dismissed)
7. [ ] Carousel doesn't error when books array is initially empty

---

## Implementation Order

1. Add `isReady` computed value to `useBooks` hook return object
2. Update App.tsx loading condition: `if (!isReady && !showOnboarding)`
3. Update App.tsx error condition: `if (error && !isReady && !showOnboarding)`
4. Test fresh load with slow network (throttle to Slow 3G)
5. Test with cached books
6. Test error scenarios

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Carousel errors with empty books array | High | Verify Carousel component handles empty array gracefully |
| User dismisses onboarding in <1 second | Low | Loading screen is acceptable fallback; most users take longer |
| Race condition between fetch and state | Low | React state updates are atomic; `isReady` derived from `allBooks.length` |
