# Lydia Easter Egg Achievement

## Overview
Add a secret achievement that unlocks when the user types "Lydia" anywhere on the site, rewarding them with a pink theme.

## Problem Statement
Easter eggs add delight and personalization to the experience. This feature is a special request to create a personalized achievement for Lydia.

## Goals
- [ ] Add a new hidden achievement triggered by typing "Lydia"
- [ ] Create a new pink theme as the reward
- [ ] Detection should work regardless of where the user types on the page

## Non-Goals
- Not adding any UI hints about this secret achievement
- Not modifying the completionist achievement requirements (this stays as a bonus secret)
- Not adding case-sensitive detection (should work for "lydia", "LYDIA", "Lydia", etc.)

---

## User Stories

### US-001: Unlock Achievement by Typing Name
**As a** user named Lydia
**I want** to type my name anywhere on the site
**So that** I get a special achievement named after me

**Acceptance Criteria:**
- [ ] Typing "lydia" (case-insensitive) triggers the achievement
- [ ] Achievement notification displays with confetti (pink-themed)
- [ ] Achievement only triggers once (subsequent typing does nothing)
- [ ] Detection works even when not focused on an input field

### US-002: Pink Theme Reward
**As a** user who unlocked the Lydia achievement
**I want** to use a pink theme
**So that** I can enjoy a personalized visual experience

**Acceptance Criteria:**
- [ ] Pink theme appears in theme selector after achievement unlock
- [ ] Pink theme has a cohesive color palette (pinks, magentas, soft whites)
- [ ] Theme persists across page refreshes
- [ ] Theme resets to default if user "remorts" (resets progress)

---

## Phases

### Phase 1: Add Pink Theme CSS
Add the new theme color definitions to the theme system.

#### 1.1 Define Pink Theme Variables
**File:** `ui/src/styles/variables.css`

Add new theme block following the existing pattern:

```css
/* Princess Pink - Unlocked by Lydia Easter Egg */
:root[data-theme="princess-pink"] {
  --ff-blue-dark: #1a0814;
  --ff-blue-mid: #3d1028;
  --ff-blue-light: #8b2050;

  --ff-border-outer: #ff69b4;
  --ff-border-inner: #db7093;
  --ff-border-shadow: #1a0814;

  --ff-text-primary: #fff0f5;
  --ff-text-secondary: #ffb6c1;
  --ff-text-narrator: #dda0dd;
  --ff-text-highlight: #ff1493;
  --ff-text-muted: #c08090;

  --ff-action-confirm: #ff69b4;
  --ff-action-cancel: #dc143c;
  --ff-action-neutral: #db7093;
}
```

### Phase 2: Register Theme and Achievement

#### 2.1 Register Theme in ThemeContext
**File:** `ui/src/contexts/ThemeContext.tsx`

Add to `ALL_THEMES` array (before the `] as const` closing):
```typescript
{ id: 'princess-pink', name: 'Princess Pink', unlockedBy: 'lydia' },
```

**Note:** The `ThemeId` type is automatically derived from `ALL_THEMES` via `typeof ALL_THEMES[number]['id']`, so adding the new entry automatically makes `'princess-pink'` a valid theme ID. No additional type changes needed.

#### 2.2 Add Achievement Definition
**File:** `ui/src/hooks/useAchievements.ts`

Add to `ACHIEVEMENTS` record:
```typescript
lydia: {
  id: 'lydia',
  title: 'ACHIEVEMENT UNLOCKED!',
  subtitle: "Lydia's Secret",
  description: 'For my little adventurer Lydia - You are my sunshine <3',
  effect: 'Princess Pink theme unlocked',
  effectType: 'visual',
  themeUnlock: 'princess-pink',
},
```

**Note:** Do NOT add 'lydia' to `COMPLETIONIST_REQUIREMENTS` - this stays as a bonus secret achievement.

### Phase 3: Add Name Detection

#### 3.1 Add Keyboard Listener for Name Detection
**File:** `ui/src/App.tsx`

Add a second keyboard listener (similar to Konami code) that tracks typed characters and detects "lydia" (case-insensitive):

```typescript
// Lydia easter egg detection
const lydiaSequence = useRef<string[]>([]);
const LYDIA_CODE = ['l', 'y', 'd', 'i', 'a'];

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Only track letter keys
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      lydiaSequence.current.push(e.key.toLowerCase());

      // Keep only the last 5 characters
      if (lydiaSequence.current.length > LYDIA_CODE.length) {
        lydiaSequence.current.shift();
      }

      // Check if sequence matches "lydia"
      if (lydiaSequence.current.length === LYDIA_CODE.length &&
          lydiaSequence.current.every((key, i) => key === LYDIA_CODE[i])) {
        lydiaSequence.current = [];

        const achievement = unlock('lydia');
        if (achievement) {
          setCurrentAchievement(achievement);
          // Pink confetti!
          confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#ff69b4', '#ff1493', '#ffb6c1', '#db7093', '#fff0f5'],
            zIndex: 1000,
          });
        }
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [unlock]);
```

---

## Technical Specifications

### Data Models

**Achievement Entry:**
```typescript
{
  id: 'lydia',
  title: 'ACHIEVEMENT UNLOCKED!',
  subtitle: "Lydia's Secret",
  description: 'Discovered a hidden easter egg!',
  effect: 'Princess Pink theme unlocked',
  effectType: 'visual',
  themeUnlock: 'princess-pink',
}
```

**Theme Entry:**
```typescript
{ id: 'princess-pink', name: 'Princess Pink', unlockedBy: 'lydia' }
```

### State Management
- Achievement stored in existing `litrpg-achievements` localStorage key
- Theme selection stored in existing `litrpg-theme` localStorage key
- No new localStorage keys required

### Theme System Integration
The existing theme system handles everything automatically once we add our entries:

1. **CSS:** `:root[data-theme="princess-pink"]` selector in `variables.css` defines colors
2. **Registration:** Adding to `ALL_THEMES` array makes it a valid `ThemeId` (TypeScript infers from `as const`)
3. **Unlock logic:** `ThemeContext.isThemeUnlocked()` checks if `unlockedBy` achievement (`'lydia'`) is in user's unlocked list
4. **Application:** `document.documentElement.setAttribute('data-theme', theme)` applies the CSS
5. **Persistence:** Theme stored in `litrpg-theme` localStorage, validated on load
6. **Remort:** If achievement is reset, `isThemeUnlocked` returns false, triggering auto-reset to `classic-blue`

---

## Files Summary

### Files to Create
None - all changes are additions to existing files.

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/styles/variables.css` | Add princess-pink theme CSS variables |
| `ui/src/contexts/ThemeContext.tsx` | Add princess-pink to ALL_THEMES array |
| `ui/src/hooks/useAchievements.ts` | Add lydia achievement definition |
| `ui/src/App.tsx` | Add keyboard listener for "lydia" detection |

---

## Quality Gates

- `cd ui && npm run typecheck` - Type checking passes
- `cd ui && npm run lint` - No linting errors
- `cd ui && npm run build` - Build succeeds

---

## Verification Checklist

1. [ ] Type "lydia" on the page (not in any input) -> Achievement notification appears with pink confetti
2. [ ] Type "LYDIA" (uppercase) -> Same achievement triggers (case-insensitive)
3. [ ] Type "lydia" again after unlocking -> No duplicate notification
4. [ ] Open StatsPanel -> "Lydia's Secret" achievement appears in unlocked list
5. [ ] Open theme selector -> "Princess Pink" theme is available
6. [ ] Select Princess Pink theme -> UI updates with pink color scheme
7. [ ] Refresh page with Princess Pink selected -> Theme persists
8. [ ] Click Remort (reset all progress) -> Theme resets to Classic Blue, achievement is gone
9. [ ] Type "lydia" after remort -> Achievement can be unlocked again
10. [ ] Type "abclydia123" -> Achievement triggers (embedded in other text)

---

## Implementation Order

1. Add princess-pink theme CSS variables to `variables.css`
2. Register theme in `ThemeContext.tsx` ALL_THEMES array
3. Add lydia achievement to `useAchievements.ts` ACHIEVEMENTS record
4. Add keyboard detection in `App.tsx`
5. Test the full flow

---

## Open Questions

- [x] Theme name: "Princess Pink" chosen for the whimsical RPG aesthetic
- [x] Achievement subtitle: "Lydia's Secret" personalizes the achievement
- [x] Completionist requirement: Excluded to keep this as a bonus secret

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Detection interferes with typing in inputs | Low | Detection works globally but doesn't prevent default behavior |
| Theme colors don't look good | Medium | Use established pink palette conventions (hot pink, rose, blush) |
