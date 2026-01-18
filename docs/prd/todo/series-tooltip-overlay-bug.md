# Series Tooltip Overlay Bug Fix

## Overview
Fix visual bug where the series tooltip overlay creates a half-bright/half-dark effect on the book dialog when hovering over the series link.

## Problem Statement
When viewing a book in the carousel and moving the mouse to the right side of the screen after opening the series modal:
1. The tooltip's dark backdrop (rgba(0, 0, 0, 0.7)) only partially covers the screen
2. The book dialog appears half-bright and half-dark
3. Background carousel cards bleed through behind both dialogs
4. The tooltip appears off-center (shifted right) instead of centered

**Expected Behavior:**
- Tooltip centered in viewport
- Dark backdrop uniformly covers entire screen
- Book dialog underneath is consistently dimmed
- Clean visual layering

**Actual Behavior (Bug):**
- Tooltip shifted to right side of screen
- Backdrop only partially covers viewport
- Book dialog has half-bright/half-dark appearance
- Visual chaos with elements bleeding through

**Root Cause:** The `SeriesTooltip` component is rendered as a child of `BookCard`. Even though it uses `position: fixed`, its z-index creates a stacking context conflict because:
- `BookCard` may create its own stacking context (via transform, opacity, or z-index)
- The tooltip's z-index (1000) competes with `SystemDialog` z-index (100) but in different stacking contexts
- The fixed overlay doesn't properly cover elements outside its parent's stacking context
- Mouse position when triggering may affect which stacking context is active

## Goals
- [ ] Fix the visual layering so tooltip backdrop covers entire screen
- [ ] Ensure proper z-index stacking order
- [ ] Prevent background elements from bleeding through

## Non-Goals
- Not redesigning the series tooltip UI
- Not changing tooltip trigger behavior (hover delay, click toggle)

---

## User Stories

### US-001: Proper Overlay Coverage
**As a** user viewing series information
**I want** the tooltip to properly overlay the entire screen
**So that** I can focus on the series list without visual distractions

**Acceptance Criteria:**
- [ ] Dark backdrop covers entire viewport when tooltip is open
- [ ] No half-bright/half-dark effect on underlying dialogs
- [ ] Background carousel cards are fully dimmed
- [ ] Tooltip modal appears centered and clearly visible

---

## Phases

### Phase 1: Diagnose Z-Index Hierarchy
Document current z-index values and identify conflicts.

**Current z-index values:**
| Component | Z-Index | Notes |
|-----------|---------|-------|
| FilterMenu | 10 | Header filter dropdown |
| SystemDialog | 100 | Book detail dialog |
| OnboardingDialog | 500 | First-time user onboarding |
| SeriesTooltip overlay | 1000 | Series list modal |
| Header | 1000 | Navigation buttons |
| Panels (Wishlist, Settings, etc.) | 1100/1101 | Slide-out panels |
| AchievementNotification | 1150 | Toast notifications |
| Carousel spin animation | 9999 | During spin |

**Problem:** SeriesTooltip (1000) should appear above SystemDialog (100), but stacking context isolation causes partial coverage.

### Phase 2: Portal Solution (Recommended)
Render SeriesTooltip at document root to escape stacking context.

#### 2.1 Create Portal Wrapper
**File:** `ui/src/components/SeriesTooltip/SeriesTooltip.tsx`

```typescript
import { createPortal } from 'react-dom';

export function SeriesTooltip({ ... }: SeriesTooltipProps) {
  // ... existing component logic ...

  const tooltipContent = (
    <div className={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div ref={modalRef} className={styles.modal} role="menu">
        {/* ... existing modal content ... */}
      </div>
    </div>
  );

  // Render at document root to escape stacking context
  return createPortal(tooltipContent, document.body);
}
```

#### 2.2 Adjust Z-Index
**File:** `ui/src/components/SeriesTooltip/SeriesTooltip.module.css`

```css
.overlay {
  /* Keep existing styles */
  z-index: 200; /* Above SystemDialog (100), below panels (1100) */
}
```

### Phase 3: Alternative - Close on Mouse Leave
If portal approach causes other issues, close tooltip when mouse leaves the card area.

#### 3.1 Add Global Mouse Tracking
**File:** `ui/src/components/Carousel/BookCard.tsx`

```typescript
// Close tooltip if mouse leaves the card entirely
useEffect(() => {
  if (!showTooltip) return;

  const handleMouseMove = (e: MouseEvent) => {
    const cardElement = cardRef.current;
    const tooltipElement = document.querySelector('[data-series-tooltip]');

    if (!cardElement) return;

    const cardRect = cardElement.getBoundingClientRect();
    const tooltipRect = tooltipElement?.getBoundingClientRect();

    const isOverCard = (
      e.clientX >= cardRect.left &&
      e.clientX <= cardRect.right &&
      e.clientY >= cardRect.top &&
      e.clientY <= cardRect.bottom
    );

    const isOverTooltip = tooltipRect && (
      e.clientX >= tooltipRect.left &&
      e.clientX <= tooltipRect.right &&
      e.clientY >= tooltipRect.top &&
      e.clientY <= tooltipRect.bottom
    );

    if (!isOverCard && !isOverTooltip) {
      setShowTooltip(false);
    }
  };

  window.addEventListener('mousemove', handleMouseMove);
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, [showTooltip]);
```

---

## Technical Specifications

### Stacking Context Rules
CSS creates a new stacking context when an element has:
- `position: absolute/relative/fixed` with `z-index` other than auto
- `opacity` less than 1
- `transform`, `filter`, `perspective` properties
- `isolation: isolate`

The `BookCard` component likely creates a stacking context, causing its child's `position: fixed` element to be constrained within that context for z-index purposes.

### Portal Benefits
- Renders element at document root, outside any parent stacking contexts
- Fixed positioning works relative to viewport as expected
- Z-index competes with all other root-level elements normally

### Z-Index After Fix
| Component | Z-Index | Notes |
|-----------|---------|-------|
| SystemDialog | 100 | Book detail dialog |
| SeriesTooltip overlay | 200 | **Changed**: Above dialog, below panels |
| Panels | 1100/1101 | Should still be above tooltip |

---

## Files Summary

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/components/SeriesTooltip/SeriesTooltip.tsx` | Wrap in createPortal to document.body |
| `ui/src/components/SeriesTooltip/SeriesTooltip.module.css` | Adjust z-index to 200 |

---

## Quality Gates

- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test` - All tests pass
- `npm run build` - Build succeeds

---

## Verification Checklist

1. [ ] Open app, spin to a book that has multiple books in series
2. [ ] Hover over series name -> tooltip opens
3. [ ] Tooltip backdrop covers entire screen (no partial coverage)
4. [ ] Book dialog underneath is uniformly dimmed
5. [ ] Background carousel cards are fully dimmed
6. [ ] Click outside tooltip -> tooltip closes
7. [ ] Press Escape -> tooltip closes
8. [ ] Click a book in tooltip -> navigates to that book, tooltip closes
9. [ ] Open Settings panel while tooltip is open -> Settings appears above tooltip
10. [ ] Mobile: tap series name -> tooltip opens correctly

---

## Implementation Order

1. Add `createPortal` import to SeriesTooltip.tsx
2. Wrap tooltip content in `createPortal(content, document.body)`
3. Update z-index in SeriesTooltip.module.css to 200
4. Test all verification items
5. If issues, consider alternative mouse-leave approach

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Portal breaks event propagation | Medium | Test click handlers still work |
| Portal animation issues | Low | Keep existing animation keyframes |
| Focus trap issues | Low | Verify Escape key still closes tooltip |
