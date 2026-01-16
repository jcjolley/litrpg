# PRD: Series Grouping with Hover Tooltip

## Overview

Group multi-book series in the carousel by showing only Book 1, with a hoverable series name that reveals a tooltip listing all books in the series. Clicking a book in the tooltip navigates the carousel to that book.

## Non-Goals

- No backend changes (no new GSI, no new API endpoints)
- No series-level metadata or AI-generated series summaries
- No "spin within series" functionality
- No changes to standalone book display
- No series filtering in the filter panel (future enhancement)

## User Stories

### US-001: See Series-Grouped Carousel
**As a** user browsing the carousel
**I want** to see only Book 1 of each series (plus standalone books)
**So that** the carousel isn't cluttered with 12 entries for one series

**Acceptance Criteria:**
- [ ] Given a series with 5 books, only Book 1 appears in the carousel
- [ ] Given a standalone book (no series), it appears normally
- [ ] Given Book 1 with `seriesPosition: 1`, it is shown; Books 2-5 are hidden
- [ ] Spin/weighted selection only considers visible books (Book 1s + standalones)

### US-002: Hover Series Name to See Tooltip
**As a** user viewing a Book 1 card
**I want** to hover over the series name to see other books in the series
**So that** I can explore the full series without leaving the carousel

**Acceptance Criteria:**
- [ ] Given a book with `series` field populated, series name is styled as hoverable (underline on hover)
- [ ] Given hover on series name, tooltip appears within 150ms
- [ ] Tooltip displays series name as header
- [ ] Tooltip lists all books: "Book 1: [title]", "Book 2: [title]", etc.
- [ ] Current book is visually marked (checkmark or highlight)
- [ ] Tooltip dismisses when mouse leaves series name AND tooltip area
- [ ] Given a standalone book (no series), no hover behavior exists

### US-003: Click Book in Tooltip to Navigate
**As a** user viewing the series tooltip
**I want** to click on any book in the list
**So that** the carousel navigates to that book's card

**Acceptance Criteria:**
- [ ] Given click on "Book 3" in tooltip, carousel animates to Book 3's position
- [ ] Book 3 becomes the selected/centered card
- [ ] Tooltip dismisses after navigation begins
- [ ] Navigation uses existing nudge animation (smooth, not jarring)

### US-004: Mobile Touch Support
**As a** mobile user
**I want** to tap the series name to toggle the tooltip
**So that** I can access series info without hover capability

**Acceptance Criteria:**
- [ ] Given tap on series name, tooltip appears
- [ ] Given second tap on series name (while tooltip open), tooltip dismisses
- [ ] Given tap outside tooltip, tooltip dismisses
- [ ] Clicking a book in tooltip still navigates carousel

## Technical Design

### Data Flow

```
allBooks (from useBooks)
    │
    ▼
┌─────────────────────────────┐
│  groupBooksBySeries()       │  New utility function
│  - Groups books by series   │
│  - Returns Book 1s + standalones for carousel
│  - Returns seriesMap for tooltip lookup
└─────────────────────────────┘
    │
    ├── visibleBooks → Carousel (for display + spin)
    │
    └── seriesMap → SeriesTooltip (for hover content)
```

### Key Implementation Details

1. **Series Grouping Logic** (`ui/src/utils/seriesGrouping.ts`):
   - Input: `Book[]`
   - Output: `{ visibleBooks: Book[], seriesMap: Map<string, Book[]> }`
   - Group by `series` field (case-insensitive)
   - Sort each series by `seriesPosition`
   - `visibleBooks` = Book 1 of each series + all books with `series: null`
   - `seriesMap` = Map from series name to sorted array of all books in series

2. **Tooltip Component** (`ui/src/components/SeriesTooltip/`):
   - Renders on hover/tap of series name
   - Receives: `series: string`, `books: Book[]`, `currentBookId: string`
   - Emits: `onBookClick(book: Book)`
   - Position: Below series name, aligned left, with arrow pointing up

3. **BookCard Enhancement**:
   - Wrap series name in hoverable span
   - Manage tooltip visibility state
   - Pass navigation callback from parent

4. **Carousel Integration**:
   - Receive `seriesMap` as prop
   - Expose `navigateToBook(bookId: string)` function
   - When tooltip clicks book, find index in `allBooks` and use `nudgeMultiple`

### State Management

```typescript
// In App.tsx or useBooks.ts
const { visibleBooks, seriesMap } = useMemo(
  () => groupBooksBySeries(filteredBooks, allBooks),
  [filteredBooks, allBooks]
);

// Carousel receives visibleBooks for display
// But needs access to allBooks for navigation to hidden books
```

**Critical Insight**: When user clicks Book 3 in tooltip:
1. Book 3 exists in `allBooks` but not in `visibleBooks`
2. We need to temporarily add Book 3 to the carousel OR
3. Better: Pass `allBooks` to carousel, but only spin/weight on `visibleBooks`

**Chosen approach**: Carousel always renders from `allBooks`, but spin selection uses `visibleBooks`. This allows navigation to any book while keeping spin focused on Book 1s.

### CSS Approach

- Tooltip uses CSS positioning (absolute, relative to series name container)
- Fade-in animation (150ms ease)
- Z-index above carousel cards
- Mobile: same component, different trigger (tap vs hover)
- Retro RPG aesthetic: pixel border, parchment-like background

## Phases

### Phase 1: Series Grouping Utility
**Files:**
- Create `ui/src/utils/seriesGrouping.ts`
- Create `ui/src/utils/seriesGrouping.test.ts`

**Tasks:**
1. Implement `groupBooksBySeries(books: Book[]): SeriesGroupResult`
2. Handle edge cases: null series, missing seriesPosition, duplicate positions
3. Write unit tests for grouping logic

**Verification:**
- [ ] `npm run test -- seriesGrouping` passes
- [ ] Function correctly groups sample data

### Phase 2: SeriesTooltip Component
**Files:**
- Create `ui/src/components/SeriesTooltip/SeriesTooltip.tsx`
- Create `ui/src/components/SeriesTooltip/SeriesTooltip.module.css`
- Create `ui/src/components/SeriesTooltip/index.ts`

**Tasks:**
1. Build tooltip UI with book list
2. Style with retro RPG aesthetic (matching existing cards)
3. Implement hover delay (150ms show, immediate hide on leave)
4. Implement click handler for book selection

**Verification:**
- [ ] Tooltip renders with correct book list
- [ ] Styling matches app aesthetic
- [ ] Click events fire correctly

### Phase 3: BookCard Series Integration
**Files:**
- Modify `ui/src/components/Carousel/BookCard.tsx`
- Modify `ui/src/components/Carousel/BookCard.module.css`

**Tasks:**
1. Make series name hoverable (add underline, cursor pointer)
2. Add state for tooltip visibility
3. Integrate SeriesTooltip component
4. Handle mouse enter/leave with delay
5. Handle touch tap toggle for mobile
6. Pass `onSeriesBookClick` callback to tooltip

**Verification:**
- [ ] Hover on series name shows tooltip
- [ ] Tooltip positioned correctly below series name
- [ ] Mobile tap toggles tooltip
- [ ] Click outside dismisses tooltip

### Phase 4: Carousel Navigation Integration
**Files:**
- Modify `ui/src/components/Carousel/Carousel.tsx`
- Modify `ui/src/components/Carousel/CarouselTrack.tsx`
- Modify `ui/src/hooks/useBooks.ts`

**Tasks:**
1. Add `seriesMap` to useBooks return value
2. Update Carousel to accept `allBooks` + `visibleBooks` props
3. Spin/weight selection uses `visibleBooks`
4. Add `navigateToBook(bookId)` function using `nudgeMultiple`
5. Wire tooltip book clicks to navigation

**Verification:**
- [ ] Carousel only shows Book 1s + standalones
- [ ] Spin only lands on visible books
- [ ] Clicking Book 3 in tooltip navigates carousel to Book 3
- [ ] Book 3 becomes centered/selected after navigation

### Phase 5: Polish and Edge Cases
**Files:**
- Various files from previous phases

**Tasks:**
1. Handle series with only 1 book (no tooltip needed)
2. Handle very long series (10+ books) - scrollable tooltip or "show all" link
3. Keyboard accessibility: Escape closes tooltip, arrow keys in tooltip
4. Animation polish: tooltip fade, navigation smoothness
5. Test with real data from production

**Verification:**
- [ ] Single-book series shows no tooltip trigger
- [ ] Long series (10+ books) displays correctly
- [ ] Keyboard navigation works
- [ ] No visual glitches during navigation

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `ui/src/utils/seriesGrouping.ts` | Series grouping logic |
| `ui/src/utils/seriesGrouping.test.ts` | Unit tests for grouping |
| `ui/src/components/SeriesTooltip/SeriesTooltip.tsx` | Tooltip component |
| `ui/src/components/SeriesTooltip/SeriesTooltip.module.css` | Tooltip styles |
| `ui/src/components/SeriesTooltip/index.ts` | Component export |

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/components/Carousel/BookCard.tsx` | Add hoverable series name, tooltip integration |
| `ui/src/components/Carousel/BookCard.module.css` | Hoverable series name styles |
| `ui/src/components/Carousel/Carousel.tsx` | Accept allBooks + visibleBooks, add navigateToBook |
| `ui/src/components/Carousel/CarouselTrack.tsx` | Pass through series-related props |
| `ui/src/hooks/useBooks.ts` | Add seriesMap to return value, apply series grouping |
| `ui/src/App.tsx` | Wire up new props if needed |

## Verification Checklist

### Functional
- [ ] Carousel shows only Book 1 of each series
- [ ] Standalone books appear normally
- [ ] Hovering series name shows tooltip with all books
- [ ] Tooltip shows current book with checkmark
- [ ] Clicking book in tooltip navigates carousel
- [ ] Mobile tap toggles tooltip
- [ ] Tap outside closes tooltip

### Visual
- [ ] Tooltip matches retro RPG aesthetic
- [ ] Series name has subtle hover indicator
- [ ] Tooltip positioned correctly (doesn't overflow viewport)
- [ ] Navigation animation is smooth

### Quality Gates
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds

## Design Decisions

1. **Long series display**: Tooltip has fixed max-height with scrollable overflow. All books visible via scroll.

2. **Series with missing Book 1**: Show the lowest-numbered book available as the series representative in the carousel.

3. **Multiple series positions**: Sort by `addedAt` as tiebreaker, log warning to console.
