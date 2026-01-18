# Onboarding Experience - "Enter Your Next World"

## Overview
A playful, RPG-style onboarding prompt that appears when the page first loads, with a hidden easter egg for cheeky users.

## User Flow

### Initial State
- Page loads with carousel **already spinning** in the background
- System dialog appears above the carousel with the prompt

### System Prompt
```
+------------------------------------------+
|              SYSTEM MESSAGE              |
+------------------------------------------+
|                                          |
|   Are you ready to enter your next       |
|   world?                                  |
|                                          |
|        [ YES ]        [ NO ]             |
|                                          |
+------------------------------------------+
```

### "Yes" Path
- Dialog dismisses
- Carousel continues spinning and lands on a recommendation
- Normal flow proceeds

### "No" Path (Easter Egg)
1. **Confetti explosion** - colorful particles across the screen
2. **8-bit trumpet fanfare** - victory sound effect
3. **Achievement notification** pops up in bottom-right corner:
   ```
   +---------------------------+
   |  ACHIEVEMENT UNLOCKED!    |
   |  "The Contrarian"         |
   +---------------------------+
   ```
4. **Snarky system message** replaces the original prompt:
   ```
   +------------------------------------------+
   |              SYSTEM MESSAGE              |
   +------------------------------------------+
   |                                          |
   |   Oh, a wise guy, huh?                   |
   |                                          |
   |   Fine. Your reward for being clever?   |
   |   I'll spin it for you this time.       |
   |                                          |
   |              [ CONTINUE ]                |
   |                                          |
   +------------------------------------------+
   ```
5. Dialog dismisses and normal flow proceeds

## Implementation Notes

### Components Needed
- `OnboardingDialog` - The system prompt component
- `AchievementNotification` - Toast-style notification for bottom-right
- `Confetti` - Particle animation (consider `canvas-confetti` library)
- Audio file for 8-bit trumpet fanfare

### State Management
- Track if user has seen onboarding (localStorage)
- Don't show onboarding on repeat visits (or make it optional in settings?)

### Audio
- Keep sound files small (8-bit style is naturally lo-fi)
- Consider `howler.js` for audio management
- Respect user's system audio preferences

### Accessibility
- Ensure dialog is keyboard navigable
- Provide way to skip/dismiss
- Consider `prefers-reduced-motion` for confetti

## Achievement Ideas (Future)
Could expand to track other achievements:
- "The Bookworm" - Added 10 books to wishlist
- "Indecisive" - Spun 50 times in one session
- "Speed Reader" - Clicked through to Audible within 2 seconds
- "Picky" - Said "Not Interested" to 10 books in a row
