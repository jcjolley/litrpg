# Performance Fixes

## Overview
Address three performance issues: inefficient keyboard event listener lifecycle in the carousel, duplicate easter egg listeners, and excessive DynamoDB operations for metric tracking.

## Problem Statement
1. **Carousel keyboard listeners** re-attach on every `spinState` change, causing listener churn during rapid state transitions
2. **Easter egg detection** uses two separate keydown listeners (Konami + Lydia), doubling keystroke processing overhead
3. **Metrics tracking** performs GetItem + PutItem (2 operations) for each impression/wishlist/click instead of atomic UpdateItem (1 operation)

## Goals
- [ ] Reduce event listener lifecycle overhead in Carousel
- [ ] Consolidate easter egg detection into single listener
- [ ] Cut DynamoDB metrics operations by 50% using atomic counters

## Non-Goals
- Not refactoring other useEffect hooks
- Not changing easter egg sequences or behavior
- Not modifying Book entity structure
- Not adding new metrics

---

## User Stories

### US-001: Stable Carousel Keyboard Navigation
**As a** user navigating books with arrow keys
**I want** responsive keyboard controls
**So that** rapid spinning doesn't cause input lag or missed keystrokes

**Acceptance Criteria:**
- [ ] Keyboard listener attached once on mount, removed on unmount
- [ ] Arrow keys only work when spinState is 'stopped' (behavior unchanged)
- [ ] No listener accumulation during rapid spin/stop cycles
- [ ] Can nudge left/right immediately after spin stops

### US-002: Efficient Easter Egg Detection
**As a** user typing easter egg sequences
**I want** detection to work without performance overhead
**So that** typing doesn't feel sluggish

**Acceptance Criteria:**
- [ ] Single keydown listener handles both Konami and Lydia codes
- [ ] Both easter eggs still trigger correctly with same sequences
- [ ] Confetti and achievement notifications unchanged
- [ ] No duplicate handlers in React DevTools

### US-003: Optimized Metrics Recording
**As a** system operator
**I want** efficient DynamoDB operations for metrics
**So that** high-traffic books don't cause excessive costs

**Acceptance Criteria:**
- [ ] Each metric increment uses single UpdateItem (not GetItem + PutItem)
- [ ] Atomic counters prevent race conditions on concurrent updates
- [ ] Returns 404 if book doesn't exist (behavior unchanged)
- [ ] updatedAt timestamp still updated on each increment

---

## Phases

### Phase 1: Carousel Keyboard Listener Optimization
Move spinState check inside handler to eliminate dependency-driven re-registration.

#### 1.1 Refactor useEffect Dependencies
**File:** `ui/src/components/Carousel/Carousel.tsx`

**Current code (lines 227-242):**
```typescript
useEffect(() => {
  if (spinState !== 'stopped') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nudge('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nudge('right');
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [spinState, nudge]);
```

**Refactored code:**
```typescript
// Use ref to track spinState without triggering effect re-runs
const spinStateRef = useRef(spinState);
useEffect(() => {
  spinStateRef.current = spinState;
}, [spinState]);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Check spinState inside handler to avoid listener churn
    if (spinStateRef.current !== 'stopped') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nudge('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nudge('right');
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [nudge]);
```

### Phase 2: Easter Egg Listener Consolidation
Combine Konami and Lydia detection into single listener.

#### 2.1 Create Unified Easter Egg Handler
**File:** `ui/src/App.tsx`

**Current structure (lines 102-179):**
- useEffect #1: Konami code (e.code-based sequence)
- useEffect #2: Lydia code (e.key-based sequence)

**Refactored structure:**
```typescript
// Single ref for both sequences
const easterEggState = useRef({
  konami: [] as string[],
  lydia: [] as string[]
});

const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
const LYDIA_CODE = ['l', 'y', 'd', 'i', 'a'];

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const state = easterEggState.current;

    // Konami tracking (uses e.code)
    state.konami.push(e.code);
    if (state.konami.length > KONAMI_CODE.length) {
      state.konami.shift();
    }
    if (state.konami.length === KONAMI_CODE.length &&
        state.konami.every((key, i) => key === KONAMI_CODE[i])) {
      state.konami = [];
      const achievement = unlock('konami');
      if (achievement) {
        setCurrentAchievement(achievement);
        confetti({ /* existing config */ });
      }
    }

    // Lydia tracking (uses e.key, letters only)
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      state.lydia.push(e.key.toLowerCase());
      if (state.lydia.length > LYDIA_CODE.length) {
        state.lydia.shift();
      }
      if (state.lydia.length === LYDIA_CODE.length &&
          state.lydia.every((key, i) => key === LYDIA_CODE[i])) {
        state.lydia = [];
        unlock('lydia');
        setCurrentAchievement(ACHIEVEMENTS.lydia);
        confetti({ /* existing config */ });
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [unlock]);
```

### Phase 3: DynamoDB Atomic Counter Implementation
Replace GetItem + PutItem pattern with UpdateItem using ADD expression.

#### 3.1 Add Low-Level DynamoDB Client
**File:** `src/main/kotlin/org/jcjolley/books/BooksService.kt`

Add DynamoDB client injection:
```kotlin
@ApplicationScoped
class BooksService(
    private val dynamoDbEnhancedClient: DynamoDbEnhancedClient,
    private val dynamoDbClient: DynamoDbClient,  // Add low-level client
    @ConfigProperty(name = "dynamodb.table.name", defaultValue = "litrpg-books-dev")
    private val tableName: String
)
```

#### 3.2 Implement Atomic Increment Helper
**File:** `src/main/kotlin/org/jcjolley/books/BooksService.kt`

```kotlin
private fun atomicIncrement(id: String, counterAttribute: String): Boolean {
    return try {
        dynamoDbClient.updateItem { request ->
            request.tableName(tableName)
                .key(mapOf("id" to AttributeValue.builder().s(id).build()))
                .updateExpression("SET #counter = if_not_exists(#counter, :zero) + :inc, updatedAt = :now")
                .expressionAttributeNames(mapOf("#counter" to counterAttribute))
                .expressionAttributeValues(mapOf(
                    ":inc" to AttributeValue.builder().n("1").build(),
                    ":zero" to AttributeValue.builder().n("0").build(),
                    ":now" to AttributeValue.builder().n(java.time.Instant.now().toEpochMilli().toString()).build()
                ))
                .conditionExpression("attribute_exists(id)")  // Only update if book exists
        }
        true
    } catch (e: ConditionalCheckFailedException) {
        false  // Book doesn't exist
    }
}
```

#### 3.3 Refactor All Increment Methods
**File:** `src/main/kotlin/org/jcjolley/books/BooksService.kt`

Replace each increment method:
```kotlin
fun incrementImpression(id: String): Boolean = atomicIncrement(id, "impressionCount")
fun incrementWishlist(id: String): Boolean = atomicIncrement(id, "wishlistCount")
fun incrementClickThrough(id: String): Boolean = atomicIncrement(id, "clickThroughCount")
fun incrementNotInterested(id: String): Boolean = atomicIncrement(id, "notInterestedCount")
fun incrementUpvote(id: String): Boolean = atomicIncrement(id, "upvoteCount")
fun incrementDownvote(id: String): Boolean = atomicIncrement(id, "downvoteCount")
```

---

## Technical Specifications

### React Ref Pattern for Event Handlers
Using refs to track changing state inside stable event handlers avoids useEffect dependency churn while maintaining correct behavior.

### DynamoDB UpdateItem vs GetItem + PutItem

| Operation | Current Pattern | Optimized Pattern |
|-----------|-----------------|-------------------|
| Read | GetItem (1 RCU) | None |
| Write | PutItem (1 WCU) | UpdateItem (1 WCU) |
| Total | 2 operations | 1 operation |

**Concurrency benefit:** Atomic ADD prevents race conditions where two concurrent reads + writes could lose an increment.

---

## Files Summary

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/components/Carousel/Carousel.tsx` | Add spinStateRef, move check inside handler |
| `ui/src/App.tsx` | Combine two easter egg useEffects into one |
| `src/main/kotlin/org/jcjolley/books/BooksService.kt` | Add DynamoDbClient, atomic increment helper |

### Files to Create
None

---

## Quality Gates

- `npm run typecheck` - UI type checking passes
- `npm run lint` - UI linting passes
- `npm run test` - UI tests pass
- `./gradlew test` - Backend tests pass
- `./gradlew build` - Backend builds

---

## Verification Checklist

### Carousel Keyboard Navigation
1. [ ] Start app, spin carousel, wait for stop
2. [ ] Press Left Arrow -> carousel nudges left
3. [ ] Press Right Arrow -> carousel nudges right
4. [ ] Rapidly spin and stop -> no input lag on arrows
5. [ ] React DevTools -> only one keydown listener for carousel

### Easter Eggs
1. [ ] Type Konami code (Up Up Down Down Left Right Left Right B A) -> confetti + achievement
2. [ ] Type "lydia" -> pink confetti + Lydia achievement
3. [ ] React DevTools -> single keydown listener for easter eggs (not two)

### DynamoDB Metrics
1. [ ] POST `/books/{id}/impression` -> returns 204, counter increments
2. [ ] POST `/books/{id}/impression` on non-existent book -> returns 404
3. [ ] CloudWatch DynamoDB metrics -> WriteCapacityUnits per increment = 1 (not 2)
4. [ ] Concurrent impressions -> no lost increments

---

## Implementation Order

1. Add spinStateRef to Carousel.tsx, update keyboard useEffect
2. Combine easter egg useEffects in App.tsx
3. Add DynamoDbClient injection to BooksService
4. Implement atomicIncrement helper method
5. Refactor all increment methods to use helper
6. Run tests, verify all checklist items

---

## Open Questions

- [ ] Should we add integration tests for atomic counter behavior?
- [ ] Should we batch multiple metric updates client-side to reduce API calls?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ref pattern harder to test | Low | Verify behavior via E2E, not unit tests |
| UpdateItem syntax errors | Medium | Test against LocalStack before deploy |
| DynamoDbClient not auto-configured | Medium | Add explicit bean producer if needed |
