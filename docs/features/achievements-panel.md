# Achievements Panel & Theme System

## Overview
Add an FF-themed Stats Panel displaying achievements, reader stats, theme selection, and a remort option. Achievements unlock visual effects and alternate color themes.

---

## Achievement Effects Summary

| Achievement | Condition | Effect | Theme Unlock |
|-------------|-----------|--------|--------------|
| The Contrarian | Say "No" | Snarky tooltips | - |
| Curious Reader | 1 wishlisted | Export wishlist | - |
| Book Hoarder | 5 wishlisted | +10 books (30 total) | - |
| Library Builder | 10 wishlisted | +20 books (50 total) | Gilded Gold |
| The Critic | 10 dismissed | 25% faster spin | Noir |
| Genre Explorer | 3 genres | "Surprise Me" filter | Forest Green |
| Speed Reader | 50 spins | 50% faster spin | Crimson Red |
| Completionist | All 7 unlocked | Golden carousel border | Rainbow Shift |

---

## Phase 1: Theme System Foundation

### 1.1 Extend CSS Variables
**File:** `ui/src/styles/variables.css`

Add theme variants using `[data-theme]` attribute selectors:
```css
:root, :root[data-theme="classic-blue"] { /* existing FF blue */ }
:root[data-theme="gilded-gold"] { /* gold/bronze palette */ }
:root[data-theme="noir"] { /* dark grays, white, red accents */ }
:root[data-theme="forest-green"] { /* deep greens, amber */ }
:root[data-theme="crimson-red"] { /* dark reds, gold text */ }
:root[data-theme="rainbow-shift"] { /* uses CSS animation for hue-rotate */ }
```

### 1.2 Theme Context
**New file:** `ui/src/contexts/ThemeContext.tsx`

```typescript
interface ThemeContextValue {
  theme: string;
  setTheme: (theme: string) => void;
  availableThemes: string[];  // Only unlocked themes
}
```
- Wraps app in provider
- Stores selection in localStorage key `litrpg-theme`
- Sets `data-theme` attribute on `document.documentElement`

### 1.3 Update App.tsx
- Wrap content in `<ThemeProvider>`
- Pass unlocked achievements to determine available themes

---

## Phase 2: Achievement Effects System

### 2.1 Extend Achievement Definitions
**File:** `ui/src/hooks/useAchievements.ts`

Add to `Achievement` interface:
```typescript
interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  effect?: string;           // Human-readable effect description
  effectType?: 'books' | 'speed' | 'feature' | 'visual';
  effectValue?: number;      // e.g., 10 for +10 books
  themeUnlock?: string;      // Theme ID unlocked
}
```

Add new achievements:
- `speedReader`: 50 spins → Crimson theme
- `completionist`: All achievements → Rainbow theme

### 2.2 Achievement Effects Hook
**New file:** `ui/src/hooks/useAchievementEffects.ts`

```typescript
interface AchievementEffects {
  bookLimit: number;         // Base 20 + bonuses
  spinSpeedMultiplier: number;  // 1.0 = normal, 0.75 = 25% faster
  hasSurpriseMe: boolean;
  hasGoldenBorder: boolean;
  hasExportWishlist: boolean;
  hasSnarkyTooltips: boolean;
}
```
Computes cumulative effects from unlocked achievements.

### 2.3 Integrate Effects
**Files to modify:**
- `ui/src/hooks/useBooks.ts` - Use `bookLimit` from effects
- `ui/src/hooks/useCarouselSpin.ts` - Use `spinSpeedMultiplier`
- `ui/src/components/FilterMenu/FilterMenu.tsx` - Add "Surprise Me" option
- `ui/src/components/Carousel/Carousel.module.css` - Golden border class

---

## Phase 3: Stats Panel Component

### 3.1 Panel Structure
**New files:**
- `ui/src/components/StatsPanel/StatsPanel.tsx`
- `ui/src/components/StatsPanel/StatsPanel.module.css`
- `ui/src/components/StatsPanel/index.ts`

### 3.2 Panel Layout
```
╔═══════════════════════════════════════════════════╗
║  READER STATS                           LV. 5     ║
╠═══════════════════════════════════════════════════╣
║  CURIOSITY    ████████░░  80    📚 x10 wishlisted ║
║  PICKINESS    ██░░░░░░░░  20    ✗ x7 dismissed    ║
║  EXPLORATION  ██████░░░░  60    🔍 x3 genres      ║
║  DEDICATION   ████░░░░░░  40    🎰 x23 spins      ║
╠═══════════════════════════════════════════════════╣
║  TITLES EARNED                            [5/8]   ║
╠═══════════════════════════════════════════════════╣
║  ★ The Contrarian      Snarky tooltips enabled    ║
║  ★ Curious Reader      Wishlist export unlocked   ║
║  ☆ Speed Reader (23/50 spins)                     ║
║                                                   ║
║  NEXT: Speed Reader                               ║
║        Unlocks: Crimson Theme + 50% faster spin   ║
╠═══════════════════════════════════════════════════╣
║  THEME: Classic Blue ▼                            ║
╠═══════════════════════════════════════════════════╣
║              [ REMORT - Start Fresh ]             ║
╚═══════════════════════════════════════════════════╝
```

### 3.3 Panel Features
- **Toggle Button**: Trophy icon in header, opens panel from right
- **Z-index**: 400 (above carousel actions, below modals)
- **Animation**: Slide from right with backdrop fade
- **Stats Bars**: Progress bars based on stats data
- **Level Calculation**: `Math.floor(unlockedCount * 1.5) + 1`
- **Theme Dropdown**: Only shows unlocked themes
- **Remort Button**: Opens confirmation dialog

### 3.4 Remort Confirmation Dialog
**New file:** `ui/src/components/RemortDialog/RemortDialog.tsx`

- Lists what will be reset (achievements, wishlist, dismissed, filters)
- Confirm/Cancel buttons
- On confirm: Clear all `litrpg-*` localStorage keys, reload page

---

## Phase 4: Integration

### 4.1 App.tsx Changes
- Add trophy button in header
- Add `<StatsPanel>` with toggle state
- Add `<RemortDialog>` with separate state
- Wrap in `<ThemeProvider>`

### 4.2 Track Spins for Speed Reader
**File:** `ui/src/App.tsx`
- Call `trackSpin()` when carousel completes a spin
- Check for speedReader achievement at 50 spins

### 4.3 Track Completionist
**File:** `ui/src/hooks/useAchievements.ts`
- After any unlock, check if all 7 others are unlocked
- Auto-unlock completionist if so

---

## Files to Create
| File | Purpose |
|------|---------|
| `ui/src/contexts/ThemeContext.tsx` | Theme state management |
| `ui/src/hooks/useAchievementEffects.ts` | Compute active effects |
| `ui/src/components/StatsPanel/StatsPanel.tsx` | Main panel component |
| `ui/src/components/StatsPanel/StatsPanel.module.css` | Panel styling |
| `ui/src/components/StatsPanel/index.ts` | Export |
| `ui/src/components/RemortDialog/RemortDialog.tsx` | Reset confirmation |
| `ui/src/components/RemortDialog/RemortDialog.module.css` | Dialog styling |
| `ui/src/components/RemortDialog/index.ts` | Export |

## Files to Modify
| File | Changes |
|------|---------|
| `ui/src/styles/variables.css` | Add 5 theme variants |
| `ui/src/hooks/useAchievements.ts` | Extended Achievement type, new achievements |
| `ui/src/hooks/useBooks.ts` | Use dynamic book limit |
| `ui/src/hooks/useCarouselSpin.ts` | Use speed multiplier |
| `ui/src/components/FilterMenu/FilterMenu.tsx` | Add "Surprise Me" option |
| `ui/src/components/Carousel/Carousel.module.css` | Golden border class |
| `ui/src/App.tsx` | ThemeProvider, StatsPanel, spin tracking |
| `ui/src/index.css` | Import order if needed |

---

## Theme Color Palettes

### Gilded Gold
```css
--ff-blue-dark: #1a1408;
--ff-blue-mid: #3d2f10;
--ff-blue-light: #8b7320;
--ff-border-outer: #ffd700;
--ff-text-highlight: #fff8dc;
```

### Noir
```css
--ff-blue-dark: #0a0a0a;
--ff-blue-mid: #1a1a1a;
--ff-blue-light: #2a2a2a;
--ff-border-outer: #4a4a4a;
--ff-text-highlight: #ff4444;
```

### Forest Green
```css
--ff-blue-dark: #001408;
--ff-blue-mid: #002810;
--ff-blue-light: #1a5028;
--ff-border-outer: #4a8858;
--ff-text-highlight: #ffb830;
```

### Crimson Red
```css
--ff-blue-dark: #140008;
--ff-blue-mid: #280010;
--ff-blue-light: #501828;
--ff-border-outer: #b84848;
--ff-text-highlight: #ffd700;
```

### Rainbow Shift
```css
/* Uses animation to cycle hue */
:root[data-theme="rainbow-shift"] {
  filter: hue-rotate(var(--hue-angle, 0deg));
  animation: rainbow-cycle 10s linear infinite;
}
@keyframes rainbow-cycle {
  to { --hue-angle: 360deg; }
}
```

---

## Verification

1. **Theme switching**: Change theme in panel, verify colors update, persist on reload
2. **Achievement effects**:
   - Add 5 books → verify 30 books load
   - Reach 50 spins → verify carousel speeds up
3. **Stats panel**: Toggle open/close, verify stats accuracy
4. **Remort**: Click remort, confirm, verify all data cleared and page reloads fresh
5. **Completionist**: Unlock all 7 → verify golden border and rainbow theme available
6. **Mobile**: Panel works on narrow screens (full width or bottom sheet)

---

## Implementation Order

1. Theme system (variables.css + ThemeContext)
2. Extended achievements (useAchievements.ts updates)
3. Achievement effects hook
4. Stats panel UI (component + styling)
5. Remort dialog
6. Integration (App.tsx wiring)
7. Effect integrations (book limit, spin speed, surprise me)
8. Visual effects (golden border)
9. Testing & polish
