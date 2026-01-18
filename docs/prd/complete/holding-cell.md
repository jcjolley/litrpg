# Carousel Holding Cell

## Overview
Limit the carousel to 30 books at a time, selected from the existing `litrpg-books-cache` (the holding cell). This prevents visual overcrowding and improves carousel performance.

## Problem Statement
Currently, all filtered books (~122 after series grouping) are passed directly to the carousel. This causes:
- Visual overcrowding with cards stacked on top of each other
- Poor performance with 60+ cards rendering simultaneously
- Each card gets only ~3 degrees of angular space, causing severe overlap

## Goals
- [ ] Limit carousel to maximum 30 books at any time
- [ ] Select fresh 30 books from holding cell on page load
- [ ] Auto-replenish carousel when fresh books run low
- [ ] Add popularity/niche weighting slider in filters

## Non-Goals
- Not caching the carousel pool separately (use holding cell directly)
- Not modifying the carousel animation or spin mechanics
- Not changing how series grouping works
- Not adding pagination UI or "load more" buttons

---

## Key Concepts

- **Holding Cell** = `litrpg-books-cache` = the existing cached books from `useBooks`
- **Carousel Pool** = 30 books selected from holding cell (not persisted separately)
- **Fresh Book** = a book the user hasn't landed on yet (not in history)

The existing `useBooks` hook already handles:
- Caching all books in localStorage (`litrpg-books-cache`)
- Incremental sync via `?since=<max-addedAt>`
- Series grouping

We just need to add a layer that selects 30 books from the series-grouped result.

---

## User Stories

### US-001: Initial Page Load
**As a** user
**I want** the carousel to show a manageable number of books on load
**So that** I can see distinct book cards without visual clutter

**Acceptance Criteria:**
- [ ] Given page loads, when carousel initializes, then 30 books are selected from holding cell
- [ ] Books are randomly selected (weighted by popularity slider)
- [ ] Series grouping still applies (only first book of each series appears)

### US-002: Filter Application
**As a** user
**I want** filters to work on the full book catalog
**So that** I can find books matching my preferences

**Acceptance Criteria:**
- [ ] Given a filter is applied, holding cell is filtered first
- [ ] Carousel receives up to 30 books that match the filter criteria
- [ ] If fewer than 30 books match, carousel shows all matching books

### US-003: Carousel Replenishment
**As a** user
**I want** the carousel to stay fresh as I spin through books
**So that** I always have new recommendations to discover

**Acceptance Criteria:**
- [ ] Given carousel has fewer than 20 "fresh" books (unseen by user)
- [ ] And holding cell has more books matching current filters
- [ ] Then new books are added to carousel (up to max 30 total)

### US-004: Immediate Book Removal
**As a** user
**I want** books I mark "not interested" to disappear immediately
**So that** the spin can't land on the same book again

**Acceptance Criteria:**
- [ ] Given user marks a book "not interested", book is removed from carousel immediately
- [ ] Carousel replenishes if needed to maintain book count
- [ ] Removed book cannot reappear in carousel during session

### US-005: Popularity/Niche Slider
**As a** user
**I want** to control whether I see popular or niche books
**So that** I can discover hidden gems or stick to proven favorites

**Acceptance Criteria:**
- [ ] Slider appears in filter dropdown menu
- [ ] Slider has three zones: Niche (left), Neutral (center), Popular (right)
- [ ] Neutral position = pure random selection
- [ ] Popular position = weight toward high wishlistCount + clickThroughCount
- [ ] Niche position = weight toward low wishlistCount + clickThroughCount
- [ ] Changing slider triggers carousel refresh with new weighted selection

---

## Technical Specifications

### Constants
```typescript
const CAROUSEL_MAX_SIZE = 30;
const REPLENISH_THRESHOLD = 20;
```

### Data Flow
```
useBooks (existing)
    │
    ├── allBooks (full catalog, cached in litrpg-books-cache)
    │
    └── books (series-grouped) ← THIS IS THE HOLDING CELL
            │
            ▼
    [apply category filters]
            │
            ▼
    [apply not-interested, completed, seen filters]
            │
            ▼
    filteredHoldingCell
            │
            ▼
    [select 30 using popularity weight]
            │
            ▼
    carouselBooks → Carousel
```

### Selection Logic
```typescript
type PopularityWeight = number;  // -1 (niche) to 1 (popular), 0 = neutral

function selectCarouselBooks(
  holdingCell: Book[],
  count: number,
  weight: PopularityWeight,
  excludeIds: Set<string>  // already in carousel or not-interested
): Book[] {
  const available = holdingCell.filter(b => !excludeIds.has(b.id));

  if (weight === 0) {
    // Pure random
    return shuffleArray(available).slice(0, count);
  }

  // Calculate popularity score
  const scored = available.map(book => ({
    book,
    score: book.wishlistCount + book.clickThroughCount
  }));

  // Sort by score
  scored.sort((a, b) => weight > 0 ? b.score - a.score : a.score - b.score);

  // Weighted random selection favoring top of list
  return weightedRandomSelection(scored, count, Math.abs(weight));
}
```

---

## Phases

### Phase 1: Create useCarouselPool Hook
**File:** `ui/src/hooks/useCarouselPool.ts`

```typescript
interface UseCarouselPoolOptions {
  holdingCell: Book[];          // series-grouped books from useBooks
  seenBookIds: Set<string>;     // from history
  notInterestedIds: string[];   // books to exclude
  popularityWeight: number;     // -1 to 1 slider value
}

interface UseCarouselPoolResult {
  carouselBooks: Book[];        // up to 30 books for carousel
  removeBook: (id: string) => void;
  refresh: () => void;
}
```

- Select 30 books on mount
- Track current carousel book IDs in state (not localStorage)
- Implement removal and replenishment

### Phase 2: Add Popularity Slider
**File:** `ui/src/components/FilterMenu.tsx`

- Add slider below existing filters
- Labels: "Niche" / "Popular"
- 5 positions: -1, -0.5, 0, 0.5, 1

**File:** `ui/src/hooks/useSettings.ts`

- Add `popularityWeight` setting (default: 0)

### Phase 3: Integrate with App
**File:** `ui/src/App.tsx`

- Use useCarouselPool hook
- Pass `carouselBooks` to Carousel instead of `filteredBooks`
- Wire removeBook to "not interested" action

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `ui/src/hooks/useCarouselPool.ts` | Selects and manages 30-book carousel subset |

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/App.tsx` | Use useCarouselPool, pass carouselBooks to Carousel |
| `ui/src/components/FilterMenu.tsx` | Add popularity slider |
| `ui/src/hooks/useSettings.ts` | Add popularityWeight setting |

---

## Verification Checklist

1. [ ] Page load → Carousel shows 30 books (or fewer if total < 30)
2. [ ] Apply genre filter → Carousel resets to 30 matching books
3. [ ] Mark book "not interested" → Book disappears immediately
4. [ ] Spin through 15+ books → Carousel replenishes with new books
5. [ ] Slide to "Popular" → Carousel favors high-engagement books
6. [ ] Slide to "Niche" → Carousel favors low-engagement books
7. [ ] Visual check: Max 30 cards visible, no severe overlap

---

## Implementation Order

1. Create `useCarouselPool.ts` with basic selection logic
2. Implement random selection of 30 books
3. Implement immediate removal on "not interested"
4. Implement replenishment logic
5. Add popularity slider to FilterMenu
6. Add popularityWeight to useSettings
7. Implement weighted selection based on slider
8. Integrate into App.tsx
9. Test all scenarios
10. Remove dead code

---

## Decisions

| Question | Decision |
|----------|----------|
| Carousel persistence | No - select fresh 30 on each page load |
| Holding cell | Use existing `litrpg-books-cache` via useBooks |
| Selection algorithm | Slider: neutral = random, ends = weighted by popularity |
| "Not interested" | Remove immediately from carousel |
