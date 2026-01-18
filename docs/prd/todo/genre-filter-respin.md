# PRD: Re-spin Carousel on Genre Filter Change

## Overview

When a user clicks a genre tag on a book card, the carousel should spin to a new book from the filtered results instead of keeping a stale index that points to a different book.

## Non-Goals

- Not changing how other filters (series, wishlist, etc.) work
- Not preserving the current selection across filter changes
- Not adding any new UI elements or confirmation dialogs

## User Stories

### US-001: Genre Click Triggers Fresh Spin

**As a** user browsing books
**I want** clicking a genre tag to show me a new recommendation from that genre
**So that** I can discover books in the genre I'm interested in

**Acceptance Criteria:**
- [ ] Clicking a genre tag filters to that genre AND triggers a carousel spin
- [ ] The spin lands on a book that matches the new filter
- [ ] No visual glitch where wrong book appears selected momentarily

## Technical Analysis

### Current Behavior (Bug)

1. User sees Book A at index 5
2. User clicks "LITRPG" genre tag
3. `booksProp` changes to filtered list
4. `selectedIndex` remains 5
5. `books[5]` is now Book B (different book)
6. UI shows Book B as "selected" even though user never chose it

### Root Cause

`Carousel.tsx` lines 300-314 only trigger a re-spin if `selectedBookId` is completely removed from the filtered list. If the book still exists (just at a different index), no re-spin occurs.

### Solution

Detect when `booksProp` changes due to filtering and trigger a fresh spin, regardless of whether the current book still exists in the new list.

## Phases

### Phase 1: Detect Filter-Induced Book Changes

**File:** `ui/src/components/Carousel/Carousel.tsx`

Track the previous `booksProp` reference and detect when it changes in a way that indicates filtering (not just reordering or initial load).

**Changes:**
- Add a ref to track previous `booksProp` identity
- Add useEffect that detects when `booksProp` reference changes after initial load
- Trigger `doSpin()` when filter change is detected

### Phase 2: Verification

Manual testing in browser to confirm:
1. Click genre tag → carousel spins to new book
2. New book matches the genre filter
3. No visual glitches during transition

## Files Summary

| File | Changes |
|------|---------|
| `ui/src/components/Carousel/Carousel.tsx` | Add effect to re-spin on booksProp change |

## Constraints

- Must not trigger spin on initial page load (existing auto-spin handles that)
- Must not trigger spin during continuous spin mode
- Must not break existing "Spin Again" button functionality

## Verification Checklist

1. [ ] Click genre tag on selected book → carousel spins
2. [ ] Landed book has the clicked genre
3. [ ] "Spin Again" still works after genre filter
4. [ ] Removing genre filter triggers new spin
5. [ ] Page refresh still auto-spins correctly
6. [ ] `npm run typecheck` passes
7. [ ] `npm run test` passes
