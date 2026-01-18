# Advanced Filters

## Overview
Add two new filter capabilities: minimum rating threshold and publication date sorting. These filters address common user needs for finding quality books and discovering new releases or classics.

## Problem Statement
Users currently cannot:
1. Filter out low-rated books (many books with < 4.0 ratings clutter recommendations)
2. Sort by publication date to find newest releases or classic titles

## Goals
- [ ] Add rating threshold filter to filter menu (4.0, 4.5, 4.8 star minimums)
- [ ] Add publication date filter to sort by newest or oldest releases
- [ ] Both filters work in combination with existing filters

## Non-Goals
- Not adding detailed rating breakdowns or histograms
- Not adding "completed series only" filter (no reliable data source)
- Not adding date range pickers (just newest/oldest sorting)
- Not modifying backend API (all filtering done client-side)

---

## User Stories

### US-001: Filter by Minimum Rating
**As a** reader who values quality
**I want** to filter books by minimum rating
**So that** I only see highly-rated recommendations

**Acceptance Criteria:**
- [ ] Rating filter appears in filter menu as new "RATING" category row
- [ ] Uses simplified 0-9 scale (4.0=0, 4.5=5, 4.9=9, below 4.0=0)
- [ ] Options: "ANY", "5+", "7+", "9" (mutually exclusive selection)
- [ ] Default is "ANY" (no filtering)
- [ ] Books with normalized rating below threshold are excluded from carousel
- [ ] Books with no ratings (numRatings = 0) are included regardless of threshold
- [ ] Filter state persists with other filters in localStorage

### US-002: Sort by Publication Date
**As a** reader looking for fresh content
**I want** to sort by publication date
**So that** I can discover new releases or find classics

**Acceptance Criteria:**
- [ ] New "RELEASE DATE" category row in filter menu
- [ ] Options: "ANY", "NEWEST FIRST", "OLDEST FIRST"
- [ ] Sorting applied before weighted random selection
- [ ] Works with all other filters
- [ ] Books with null releaseDate sorted to end

---

## Phases

### Phase 1: Update Filter Types
Extend BookFilters to support new categories.

#### 1.1 Update Filter Interface
**File:** `ui/src/api/books.ts`

```typescript
export interface BookFilters {
  genre: CategoryFilters;
  author: CategoryFilters;
  narrator: CategoryFilters;
  length: CategoryFilters;
  source: CategoryFilters;
  seriesPosition: CategoryFilters;
  // New filter categories
  minRating: number | null;  // null = any, otherwise 5, 7, or 9 (normalized scale)
  releaseDateSort: 'any' | 'newest' | 'oldest';
}

export const EMPTY_FILTERS: BookFilters = {
  genre: {},
  author: {},
  narrator: {},
  length: {},
  source: {},
  seriesPosition: { first: 'include' },
  minRating: null,
  releaseDateSort: 'any',
};

// Convert Audible 4.0-5.0 rating to 0-9 scale
// 4.0 = 0, 4.5 = 5, 5.0 = 10 (capped at 9)
// Ratings below 4.0 are treated as 0
export function normalizeRating(rating: number): number {
  if (rating < 4.0) return 0;
  return Math.min(9, Math.round((rating - 4.0) * 10));
}
```

#### 1.2 Update hasActiveFilters
**File:** `ui/src/api/books.ts`

```typescript
export function hasActiveFilters(filters: BookFilters): boolean {
  const categoryActive = Object.entries(filters)
    .filter(([key]) => !['minRating', 'releaseDateSort'].includes(key))
    .some(([_, category]) =>
      typeof category === 'object' &&
      Object.values(category).some(state => state !== 'neutral')
    );

  return categoryActive || filters.minRating !== null || filters.releaseDateSort !== 'any';
}
```

### Phase 2: Rating Filter UI
Add rating category to filter menu.

#### 2.1 Add Rating Constants
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

```typescript
// Rating options using normalized 0-9 scale
// 5 = 4.5 stars, 7 = 4.7 stars, 9 = 4.9 stars
const RATING_OPTIONS = [
  { value: null, label: 'ANY RATING' },
  { value: 5, label: '5+ (4.5+ STARS)' },
  { value: 7, label: '7+ (4.7+ STARS)' },
  { value: 9, label: '9 (4.9+ STARS)' },
];

const RELEASE_DATE_OPTIONS = [
  { value: 'any' as const, label: 'ANY ORDER' },
  { value: 'newest' as const, label: 'NEWEST FIRST' },
  { value: 'oldest' as const, label: 'OLDEST FIRST' },
];
```

#### 2.2 Extend FilterRow Type
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

```typescript
type FilterRow = 'source' | 'author' | 'narrator' | 'genre' | 'length' | 'series' | 'discovery' | 'rating' | 'releaseDate';
```

#### 2.3 Add Rating Category Row
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

In the categories section, add after LENGTH:
```tsx
<button
  className={`${styles.categoryRow} ${activeRow === 'rating' ? styles.activeRow : ''} ${filters.minRating !== null ? styles.hasFilters : ''}`}
  onClick={() => handleRowClick('rating')}
>
  <span className={styles.cursor}>{activeRow === 'rating' ? '>' : ' '}</span>
  <span className={styles.categoryLabel}>RATING</span>
</button>
```

#### 2.4 Add Rating Options Panel
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

In the options section:
```tsx
{activeRow === 'rating' && (
  <div className={styles.optionsList}>
    {RATING_OPTIONS.map(opt => (
      <button
        key={opt.value ?? 'any'}
        className={`${styles.optionItem} ${filters.minRating === opt.value ? styles.optionInclude : ''}`}
        onClick={() => onFiltersChange({ ...filters, minRating: opt.value })}
      >
        {filters.minRating === opt.value && opt.value !== null ? `+ ${opt.label}` : opt.label}
      </button>
    ))}
    <div className={styles.seriesHint}>
      Books with no ratings are always included
    </div>
  </div>
)}
```

### Phase 3: Release Date Sort UI
Add release date category.

#### 3.1 Add Release Date Category Row
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

In the categories section, add after RATING:
```tsx
<button
  className={`${styles.categoryRow} ${activeRow === 'releaseDate' ? styles.activeRow : ''} ${filters.releaseDateSort !== 'any' ? styles.hasFilters : ''}`}
  onClick={() => handleRowClick('releaseDate')}
>
  <span className={styles.cursor}>{activeRow === 'releaseDate' ? '>' : ' '}</span>
  <span className={styles.categoryLabel}>RELEASE DATE</span>
</button>
```

#### 3.2 Add Release Date Options Panel
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

```tsx
{activeRow === 'releaseDate' && (
  <div className={styles.optionsList}>
    {RELEASE_DATE_OPTIONS.map(opt => (
      <button
        key={opt.value}
        className={`${styles.optionItem} ${filters.releaseDateSort === opt.value ? styles.optionInclude : ''}`}
        onClick={() => onFiltersChange({ ...filters, releaseDateSort: opt.value })}
      >
        {filters.releaseDateSort === opt.value && opt.value !== 'any' ? `+ ${opt.label}` : opt.label}
      </button>
    ))}
    <div className={styles.seriesHint}>
      Sort books by publication date
    </div>
  </div>
)}
```

### Phase 4: Filter Application Logic
Apply new filters in useCarouselPool hook.

#### 4.1 Add Date Parsing Utility
**File:** `ui/src/hooks/useCarouselPool.ts`

```typescript
// Parse release date strings from various formats
function parseReleaseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  // Try standard Date.parse first
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  // Handle MM-DD-YY format common in Audible
  const shortMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (shortMatch) {
    const [, month, day, year] = shortMatch;
    const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }

  return null;
}
```

#### 4.2 Update Filter Application
**File:** `ui/src/hooks/useCarouselPool.ts`

Add to existing filter logic:
```typescript
import { normalizeRating } from '../api/books';

function applyFilters(books: Book[], filters: BookFilters): Book[] {
  let result = books;

  // ... existing genre/author/narrator/length/source/series filters ...

  // Rating filter - exclude books below threshold (but keep unrated books)
  // Uses normalized 0-9 scale where 4.0=0, 4.5=5, 5.0=10 (capped at 9)
  if (filters.minRating !== null) {
    result = result.filter(book =>
      book.numRatings === 0 || normalizeRating(book.rating) >= filters.minRating!
    );
  }

  // Release date sort - applied after filtering, before weighted random
  if (filters.releaseDateSort !== 'any') {
    result = [...result].sort((a, b) => {
      const dateA = parseReleaseDate(a.releaseDate);
      const dateB = parseReleaseDate(b.releaseDate);

      // Books without dates go to end
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return filters.releaseDateSort === 'newest'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });
  }

  return result;
}
```

### Phase 5: Filter Summary Updates
Show new filters in collapsed header.

#### 5.1 Update getSummaryText
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

```typescript
const getSummaryText = () => {
  const parts: string[] = [];

  // ... existing category parts ...

  // Rating filter (show normalized scale value)
  if (filters.minRating !== null) {
    parts.push(`+RATING ${filters.minRating}+`);
  }

  // Release date sort
  if (filters.releaseDateSort !== 'any') {
    parts.push(filters.releaseDateSort === 'newest' ? '+NEWEST' : '+OLDEST');
  }

  return parts.length > 0 ? parts.join(' | ') : 'No filters';
};
```

### Phase 6: Clear All Support
Ensure CLEAR ALL resets new filters.

#### 6.1 Verify handleClearAll
**File:** `ui/src/components/FilterMenu/FilterMenu.tsx`

The existing `handleClearAll` uses `EMPTY_FILTERS`, which will already include the new default values once Phase 1 is complete. No changes needed.

---

## Technical Specifications

### Rating Normalization
Audible ratings cluster between 4.0-5.0 stars. We normalize to a 0-9 scale for easier filtering:

| Audible Rating | Normalized Score |
|----------------|------------------|
| < 4.0 | 0 |
| 4.0 | 0 |
| 4.5 | 5 |
| 4.7 | 7 |
| 4.9 | 9 |
| 5.0 | 10 (capped to 9) |

Formula: `Math.min(9, Math.round((rating - 4.0) * 10))`

### Filter State Shape
```typescript
interface BookFilters {
  // Existing
  genre: CategoryFilters;
  author: CategoryFilters;
  narrator: CategoryFilters;
  length: CategoryFilters;
  source: CategoryFilters;
  seriesPosition: CategoryFilters;
  // New
  minRating: number | null;  // 5, 7, or 9 (normalized scale); null = any
  releaseDateSort: 'any' | 'newest' | 'oldest';
}
```

### Date Parsing Strategy
Audible uses multiple date formats:
- "January 15, 2024" - standard Date.parse handles
- "01-15-24" - MM-DD-YY needs custom parsing
- "2024-01-15" - ISO format, Date.parse handles

### Filter Application Order
1. Existing category filters (genre, author, etc.)
2. Rating threshold filter
3. Release date sort (stable sort preserving other ordering)

---

## Files Summary

### Files to Create
None

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/api/books.ts` | Extend BookFilters, update EMPTY_FILTERS, update hasActiveFilters |
| `ui/src/components/FilterMenu/FilterMenu.tsx` | Add 2 new filter categories, update FilterRow type, update getSummaryText |
| `ui/src/hooks/useCarouselPool.ts` | Add parseReleaseDate, apply rating and date filters |

---

## Quality Gates

- `npm run typecheck` - UI type checking passes
- `npm run lint` - UI linting passes
- `npm run test` - UI tests pass
- `npm run build` - UI builds successfully

---

## Verification Checklist

### Rating Filter
1. [ ] Open filter menu -> RATING row visible between LENGTH and RELEASE DATE
2. [ ] Click "5+ (4.5+ STARS)" -> option highlighted, summary shows "+RATING 5+"
3. [ ] Spin carousel -> only books with rating >= 4.5 or numRatings=0 appear
4. [ ] Click "7+ (4.7+ STARS)" -> switches to higher threshold
5. [ ] Click "ANY RATING" -> filter removed, summary updates
6. [ ] Combine with genre filter -> both apply

### Release Date Sort
1. [ ] Open filter menu -> RELEASE DATE row visible after RATING
2. [ ] Click "NEWEST FIRST" -> option highlighted, summary shows "+NEWEST"
3. [ ] Spin carousel -> newer releases appear more frequently
4. [ ] Click "OLDEST FIRST" -> classics appear more frequently
5. [ ] Click "ANY ORDER" -> sort removed
6. [ ] Combine with rating filter -> both apply

### Filter Interactions
1. [ ] Set rating 5+, newest first -> both filters active
2. [ ] CLEAR ALL -> both filters reset to defaults
3. [ ] Refresh page -> filters persist in localStorage
4. [ ] Filter pool to zero books -> show "No books match" (if implemented)

---

## Implementation Order

1. Update BookFilters type and EMPTY_FILTERS in books.ts
2. Update hasActiveFilters to handle new filter types
3. Add RATING_OPTIONS and RELEASE_DATE_OPTIONS constants
4. Extend FilterRow type
5. Add Rating category row to categories section
6. Add Rating options panel to options section
7. Add Release Date category row
8. Add Release Date options panel
9. Add parseReleaseDate utility function
10. Apply rating filter in useCarouselPool
11. Apply release date sort in useCarouselPool
12. Update getSummaryText for new filters
13. Test all combinations in browser

---

## Open Questions

- [x] ~~Should unrated books be included or excluded by rating filter?~~ Included (numRatings=0 always passes)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Date parsing inconsistencies | Low | Fallback to original order for unparseable dates |
| Filter combinations reduce pool to zero | Medium | Show "No books match filters" message (future enhancement) |
| Release date sorting affects weighted random | Low | Sort first, then apply weighted random to sorted pool |
