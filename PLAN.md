# Fluid Responsive Design - Zero Media Queries

## Design Philosophy

**One design that works everywhere** - not through breakpoints, but through fluid mathematics and flexbox.

### Core Principles

1. **No `@media` queries** - Layout adapts through flex and calc, not breakpoints
2. **No viewport units** - No `vh`, `vw`, `dvh`, `svh`, `vmin`, `vmax`
3. **Complete flex chain** - From `<html>` to the card, every container participates in flex layout
4. **Intrinsic sizing** - Content determines natural size, constrained by min/max
5. **Fluid scaling** - `clamp(min, preferred, max)` for smooth transitions

---

## The Flex Chain

Every element from root to card must participate in the flex chain:

```
html                    height: 100%
└── body                height: 100%, margin: 0
    └── #root           height: 100%, display: flex, flex-direction: column
        └── .app        flex: 1, display: flex, flex-direction: column, min-height: 0
            ├── .header flex-shrink: 0 (takes natural height)
            └── .main   flex: 1, min-height: 0, display: flex
                └── .container  flex: 1, display: flex, flex-direction: column, min-height: 0
                    ├── .viewport   flex: 1, min-height: 0 (card area)
                    └── .actionBar  flex-shrink: 0 (buttons)
```

**Critical:** Every flex container in the chain needs `min-height: 0` to allow shrinking below content size.

---

## Layout Structure

```
┌────────────────────────────────────┐
│            .header                 │ flex-shrink: 0
│  [📚] [📜] [▼ Filters    ] [ℹ] [🏆]│ height: auto (content-based)
├────────────────────────────────────┤
│                                    │
│            .viewport               │ flex: 1
│                                    │ min-height: 0
│      ┌──────────────────────┐      │ display: flex
│      │                      │      │ align-items: center
│      │       .card          │      │ justify-content: center
│      │                      │      │
│      │   (carousel wheel    │      │
│      │    positions cards   │      │
│      │    via JS)           │      │
│      │                      │      │
│      └──────────────────────┘      │
│                                    │
├────────────────────────────────────┤
│            .actionBar              │ flex-shrink: 0
│  [Wishlist] [Complete] [Spin] [Hide]│ flex-wrap: wrap
└────────────────────────────────────┘
```

---

## Fluid Sizing with clamp()

### Action Buttons
```css
.actionButton {
  /* Buttons grow/shrink, with 70px ideal basis */
  flex: 1 1 70px;

  /* But never smaller than 55px (forces wrap) */
  min-width: 55px;

  /* Fluid font size: 7px minimum, 14px maximum */
  font-size: clamp(0.4375rem, 2cqi, 0.875rem);

  /* Fluid padding */
  padding: clamp(0.375rem, 2%, 1rem) clamp(0.25rem, 1%, 0.5rem);
}
```

**How this works:**
- Wide container: 4 buttons fit in one row
- Medium container: might still fit 4, slightly smaller
- Narrow container: buttons wrap to 2x2 grid naturally
- Very narrow: buttons wrap to 1 column

### Card Sizing
```css
.cardLarge {
  /* Width: minimum 280px, preferred 95% of container, max 700px */
  width: clamp(280px, calc(100% - 1rem), 700px);

  /* Height: let content determine, but cap at 95% of viewport area */
  max-height: calc(100% - 1rem);

  /* Allow scrolling if content exceeds */
  overflow-y: auto;
}
```

### Spacing
```css
.actionBar {
  /* Fluid gap */
  gap: clamp(0.25rem, 1.5%, 0.75rem);

  /* Fluid padding */
  padding: clamp(0.25rem, 2%, 1rem);
}
```

---

## Action Bar: In Flow, Not Fixed

**Current (Problematic):**
```css
.actionBar {
  position: fixed;
  bottom: 8%;
}
```

**Proposed (In Flow):**
```css
.actionBar {
  /* Part of flex layout, not overlaying */
  position: static;
  flex-shrink: 0;

  /* Buttons wrap naturally */
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
```

**Why this works:**
- Action bar takes its natural height based on content
- On narrow screens, buttons wrap → taller action bar → less space for card → card adapts
- No need to "know" the screen size

---

## The Carousel Wheel

The carousel wheel effect is handled by JavaScript in `CarouselTrack.tsx`. It calculates card positions based on angle and places them in a circle.

**Key insight:** The JS already adapts to container size. The CSS just needs to:
1. Not interfere with the JS positioning
2. Provide proper overflow handling
3. Let the container size be determined by flex

### Carousel Container
```css
.container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewport {
  flex: 1;
  min-height: 0;
  position: relative;  /* For absolute positioned cards */
  overflow: hidden;    /* Clip cards outside */
}

.track {
  position: absolute;
  top: 50%;
  left: 50%;
  /* JS positions cards relative to this point */
}

.cardWrapper {
  position: absolute;
  /* JS sets transform for each card */
}
```

### Natural Visibility
On smaller containers:
- Cards positioned outside the visible area are clipped
- Effectively shows fewer cards without media queries
- The "wheel" effect gracefully degrades

---

## Complete CSS Structure

```css
/* ============================================
   FLUID RESPONSIVE - NO MEDIA QUERIES
   ============================================ */

/* === RESET === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
}

/* === FLEX CHAIN === */
#root {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(0.25rem, 2%, 1.5rem);
}

.header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(0.25rem, 1%, 0.5rem);
  padding: clamp(0.25rem, 1%, 0.5rem) 0;
}

.main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* === CAROUSEL === */
.container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.track {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}

.cardWrapper {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: center center;
}

/* === CARD === */
.cardLarge {
  width: clamp(280px, calc(100% - 1rem), 700px);
  max-height: calc(100% - 1rem);
  overflow-y: auto;

  /* Centering offset (half of width) */
  margin-left: clamp(-350px, calc(-50% + 0.5rem), -140px);
  margin-top: -40%;

  display: flex;
  flex-direction: column;
}

.cardLargeBody {
  padding: clamp(0.5rem, 3%, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.25rem, 1%, 0.5rem);
}

.cardLargeTitle {
  font-size: clamp(0.875rem, 4cqi, 1.5rem);
  line-height: 1.2;
}

.cardLargeDescription {
  font-size: clamp(0.625rem, 2.5cqi, 0.875rem);
  line-height: 1.5;
}

/* === ACTION BAR === */
.actionBar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(0.25rem, 1.5%, 0.75rem);
  padding: clamp(0.25rem, 2%, 1rem);

  /* Styling */
  background: linear-gradient(180deg, var(--ff-blue-mid) 0%, var(--ff-blue-dark) 100%);
  border: clamp(2px, 0.5%, 4px) solid var(--ff-border-outer);
  border-radius: clamp(6px, 1%, 12px);
}

.actionButton {
  flex: 1 1 70px;
  min-width: 55px;

  padding: clamp(0.375rem, 2%, 1rem) clamp(0.25rem, 1%, 0.5rem);
  font-size: clamp(0.4375rem, 2cqi, 0.875rem);

  border: clamp(2px, 0.3%, 3px) solid var(--ff-border-outer);
  border-radius: clamp(4px, 0.5%, 8px);

  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === HEADER BUTTONS === */
.stats-button {
  width: clamp(32px, 8%, 48px);
  height: clamp(32px, 8%, 48px);
  font-size: clamp(14px, 4%, 20px);
  flex-shrink: 0;
}
```

---

## Implementation Steps

### Step 1: Update index.css
- Ensure flex chain from html → body → #root → .app → .main
- Add `min-height: 0` to all flex containers
- Use clamp() for .app padding
- Use clamp() for header button sizes

### Step 2: Rewrite Carousel.module.css
- Remove ALL `@media` queries
- Remove ALL `vh`/`vw` units
- Use `flex: 1` and `min-height: 0` pattern
- Use `clamp()` for all sizing
- Make actionBar `position: static` (in flex flow)

### Step 3: Update Carousel.tsx (if needed)
- Ensure actionBar is rendered as a flex sibling of viewport
- Currently it's outside .viewport which is correct

### Step 4: Test and Tune
- Test on various sizes
- Adjust clamp() values as needed
- Verify carousel wheel still works

---

## Container Query Units

For font sizes relative to container (not viewport), we can use:
- `cqi` - 1% of container inline size (width in horizontal writing)
- `cqb` - 1% of container block size (height)

This requires setting up a container:
```css
.container {
  container-type: size;
}

.cardLargeTitle {
  font-size: clamp(0.875rem, 4cqi, 1.5rem);
}
```

**Note:** Container queries have good browser support (Chrome 105+, Safari 16+, Firefox 110+).

---

## Fallback Strategy

If we need to support older browsers without container queries:
- Use `rem` with `clamp()` for font sizes
- The layout will still work, just fonts won't scale with container

```css
/* With container queries */
font-size: clamp(0.875rem, 4cqi, 1.5rem);

/* Fallback without */
font-size: clamp(0.875rem, 2.5%, 1.5rem);
```

---

## Testing Checklist

Without media queries, test at these widths:
- [ ] 320px (very narrow phone)
- [ ] 375px (iPhone SE/mini)
- [ ] 390px (iPhone 14)
- [ ] 428px (iPhone 14 Pro Max)
- [ ] 768px (tablet portrait)
- [ ] 1024px (tablet landscape / small desktop)
- [ ] 1440px (desktop)
- [ ] 1920px (large desktop)

And these heights:
- [ ] 568px (iPhone SE landscape)
- [ ] 667px (iPhone 8)
- [ ] 844px (iPhone 14)
- [ ] 1024px (tablet)

The design should gracefully adapt at ALL sizes, not just these breakpoints.
