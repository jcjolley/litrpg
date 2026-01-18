# Testing Infrastructure

## Overview
Establish comprehensive test coverage to catch regressions before deployment. Adds coverage reporting, fixes disabled tests, and adds critical unit tests.

## Problem Statement
Current testing gaps create deployment risk:
1. **No coverage reporting** - No jacoco (backend) or c8/istanbul (frontend) configured
2. **Disabled tests** - 4 BooksQueryTest incremental sync tests are disabled due to Lambda mock timeout
3. **Critical untested code** - `weightedRandom.ts` contains core business logic with zero tests
4. **Minimal component coverage** - 17 components but only 2 test files

## Goals
- [ ] Add jacoco coverage for backend with 80% threshold
- [ ] Add vitest coverage for frontend with 80% threshold
- [ ] Fix or properly document 4 disabled incremental sync tests
- [ ] Add comprehensive weightedRandom.ts unit tests
- [ ] Add component smoke tests for critical UI components

## Non-Goals
- Not adding E2E tests (Playwright/Cypress) in this iteration
- Not adding visual regression tests
- Not reaching 100% coverage (80% is the target)
- Not adding BookMetricsResource integration tests (deferred to atomic counters PRD)
- Not setting up GitHub Actions CI (can be added later when needed)

---

## User Stories

### US-001: Backend Coverage Reporting
**As a** developer
**I want** to see test coverage for Kotlin code
**So that** I can identify untested code paths

**Acceptance Criteria:**
- [ ] `./gradlew test jacocoTestReport` generates HTML coverage report
- [ ] Coverage report available at `build/reports/jacoco/test/html/index.html`
- [ ] Build fails if line coverage drops below 80%
- [ ] Coverage badge in README

### US-002: Frontend Coverage Reporting
**As a** developer
**I want** to see test coverage for React/TypeScript code
**So that** I can identify untested components and utilities

**Acceptance Criteria:**
- [ ] `npm run test:coverage` generates coverage report
- [ ] Coverage report available at `ui/coverage/index.html`
- [ ] Build fails if line coverage drops below 80%
- [ ] Vitest UI shows coverage inline

### US-003: Fix Disabled Tests
**As a** developer
**I want** disabled tests either fixed or properly documented
**So that** I understand what's tested and what's not

**Acceptance Criteria:**
- [ ] Investigate Lambda mock timeout root cause
- [ ] Either fix tests or move to dedicated integration test suite
- [ ] If unfixable, document why and remove @Disabled in favor of exclusion

### US-004: WeightedRandom Unit Tests
**As a** developer
**I want** comprehensive tests for the recommendation algorithm
**So that** I can refactor with confidence

**Acceptance Criteria:**
- [ ] Test `calculateBookWeight` with various input combinations
- [ ] Test `selectWeightedRandom` distribution
- [ ] Test edge cases: empty array, all wishlisted, single book
- [ ] Tests cover impression penalty, engagement bonus, recency bonus, rating bonus

### US-005: Component Smoke Tests
**As a** developer
**I want** basic render tests for critical components
**So that** I catch obvious render failures

**Acceptance Criteria:**
- [ ] Smoke tests for critical components: Carousel, SystemDialog, FilterMenu
- [ ] Tests verify component renders without crashing
- [ ] Tests verify key elements are present
- [ ] MSW mocks API calls where needed

---

## Phases

### Phase 1: Backend Coverage (Jacoco)
Add jacoco plugin and coverage thresholds.

#### 1.1 Add Jacoco Plugin
**File:** `build.gradle.kts`

```kotlin
plugins {
    kotlin("jvm") version "2.3.0"
    kotlin("plugin.allopen") version "2.3.0"
    id("io.quarkus")
    id("jacoco")  // Add jacoco plugin
}

jacoco {
    toolVersion = "0.8.12"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                minimum = "0.80".toBigDecimal()
            }
        }
    }
}

tasks.check {
    dependsOn(tasks.jacocoTestCoverageVerification)
}
```

#### 1.2 Add Makefile Target
**File:** `Makefile`

```makefile
.PHONY: test-coverage
test-coverage: localstack-init  ## Run tests with coverage
	./gradlew test jacocoTestReport
	@echo "Coverage report: build/reports/jacoco/test/html/index.html"
```

### Phase 2: Frontend Coverage (Vitest)
Add coverage configuration to vitest.

#### 2.1 Install Coverage Dependencies
**File:** `ui/package.json`

Add to devDependencies:
```json
"@vitest/coverage-v8": "^2.1.8"
```

#### 2.2 Configure Vitest Coverage
**File:** `ui/vite.config.ts` or `ui/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

#### 2.3 Add Package.json Scripts
**File:** `ui/package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Phase 3: Fix Disabled Tests
Address the 4 disabled BooksQueryTest tests.

#### 3.1 Investigate Root Cause
**File:** `src/test/kotlin/org/jcjolley/books/BooksQueryTest.kt`

The tests are disabled due to `SocketTimeoutException in the Lambda mock event server` when querying the `addedAt-index` GSI.

Options:
1. **Fix**: Increase timeout or investigate Lambda mock layer
2. **Move**: Create separate integration test suite that runs against real Lambda
3. **Document**: If unfixable, create tracking issue and remove @Disabled annotation

#### 3.2 Decision: Move to Separate Suite
Create a new test class that runs only in CI with longer timeouts:

**File:** `src/test/kotlin/org/jcjolley/books/BooksGSIIntegrationTest.kt`

```kotlin
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Tag("gsi-integration")  // Run separately with: ./gradlew test -PincludeTags=gsi-integration
class BooksGSIIntegrationTest {
    // Move the 4 GSI tests here
}
```

#### 3.3 Configure Gradle Test Tags
**File:** `build.gradle.kts`

```kotlin
tasks.test {
    useJUnitPlatform {
        // Exclude GSI tests by default (run in CI with extended timeout)
        excludeTags("gsi-integration")
    }
}

tasks.register<Test>("testGSI") {
    useJUnitPlatform {
        includeTags("gsi-integration")
    }
    timeout = Duration.ofMinutes(5)
}
```

### Phase 4: WeightedRandom Unit Tests
Add comprehensive tests for the recommendation algorithm.

#### 4.1 Create Test File
**File:** `ui/src/utils/weightedRandom.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { calculateBookWeight, selectWeightedRandom, findBookIndex } from './weightedRandom';
import type { Book } from '../types/book';

// Test factory for creating books
function createBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'test-id',
    title: 'Test Book',
    author: 'Test Author',
    subtitle: null,
    narrator: null,
    series: null,
    seriesPosition: null,
    genres: ['LitRPG'],
    length: null,
    releaseDate: null,
    language: 'English',
    imageUrl: 'https://example.com/image.jpg',
    source: 'AUDIBLE',
    audibleUrl: null,
    audibleAsin: null,
    royalRoadUrl: null,
    royalRoadId: null,
    rating: 4.5,
    numRatings: 1000,
    pageCount: null,
    description: 'A test book',
    wishlistCount: 0,
    clickThroughCount: 0,
    notInterestedCount: 0,
    impressionCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    addedAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('calculateBookWeight', () => {
  it('returns 0 for books in user wishlist', () => {
    const book = createBook({ id: 'book-1' });
    expect(calculateBookWeight(book, ['book-1'], 100)).toBe(0);
  });

  it('returns positive weight for books not in wishlist', () => {
    const book = createBook({ id: 'book-1' });
    expect(calculateBookWeight(book, [], 100)).toBeGreaterThan(0);
  });

  it('applies impression penalty (more impressions = lower weight)', () => {
    const lowImpression = createBook({ impressionCount: 10 });
    const highImpression = createBook({ impressionCount: 100 });

    const lowWeight = calculateBookWeight(lowImpression, [], 100);
    const highWeight = calculateBookWeight(highImpression, [], 100);

    expect(lowWeight).toBeGreaterThan(highWeight);
  });

  it('applies engagement bonus (more wishlist/clicks = higher weight)', () => {
    const lowEngagement = createBook({ wishlistCount: 0, clickThroughCount: 0 });
    const highEngagement = createBook({ wishlistCount: 10, clickThroughCount: 20 });

    const lowWeight = calculateBookWeight(lowEngagement, [], 100);
    const highWeight = calculateBookWeight(highEngagement, [], 100);

    expect(highWeight).toBeGreaterThan(lowWeight);
  });

  it('applies recency bonus for books added in last 30 days', () => {
    const now = Date.now();
    const recentBook = createBook({ addedAt: now - 1000 * 60 * 60 * 24 * 5 }); // 5 days ago
    const oldBook = createBook({ addedAt: now - 1000 * 60 * 60 * 24 * 60 }); // 60 days ago

    const recentWeight = calculateBookWeight(recentBook, [], 100);
    const oldWeight = calculateBookWeight(oldBook, [], 100);

    expect(recentWeight).toBeGreaterThan(oldWeight);
  });

  it('applies rating bonus for 4.5+ rated books', () => {
    const highRated = createBook({ rating: 4.8 });
    const lowRated = createBook({ rating: 3.5 });

    const highWeight = calculateBookWeight(highRated, [], 100);
    const lowWeight = calculateBookWeight(lowRated, [], 100);

    expect(highWeight).toBeGreaterThan(lowWeight);
  });

  it('never returns weight less than 1', () => {
    const worstCase = createBook({
      impressionCount: 1000,
      wishlistCount: 0,
      clickThroughCount: 0,
      rating: 2.0,
      addedAt: 0, // Very old
    });

    expect(calculateBookWeight(worstCase, [], 1000)).toBeGreaterThanOrEqual(1);
  });
});

describe('selectWeightedRandom', () => {
  it('returns null for empty array', () => {
    expect(selectWeightedRandom([], [])).toBeNull();
  });

  it('returns the only book when array has one element', () => {
    const book = createBook({ id: 'only-book' });
    const result = selectWeightedRandom([book], []);
    expect(result?.id).toBe('only-book');
  });

  it('excludes wishlisted books from selection', () => {
    const books = [
      createBook({ id: 'book-1' }),
      createBook({ id: 'book-2' }),
    ];

    // Mock random to always return 0
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = selectWeightedRandom(books, ['book-1']);

    // Should select book-2 since book-1 is wishlisted
    expect(result?.id).toBe('book-2');

    vi.restoreAllMocks();
  });

  it('returns random book when all books are wishlisted', () => {
    const books = [
      createBook({ id: 'book-1' }),
      createBook({ id: 'book-2' }),
    ];

    const result = selectWeightedRandom(books, ['book-1', 'book-2']);

    // Should still return a book (fallback behavior)
    expect(result).not.toBeNull();
  });

  it('respects weight distribution over many iterations', () => {
    const highWeight = createBook({ id: 'high', wishlistCount: 10, clickThroughCount: 20 });
    const lowWeight = createBook({ id: 'low', wishlistCount: 0, clickThroughCount: 0 });

    const results: Record<string, number> = { high: 0, low: 0 };

    // Run 1000 iterations
    for (let i = 0; i < 1000; i++) {
      const result = selectWeightedRandom([highWeight, lowWeight], []);
      if (result) results[result.id]++;
    }

    // High weight book should be selected more often
    expect(results.high).toBeGreaterThan(results.low);
  });
});

describe('findBookIndex', () => {
  it('returns correct index for existing book', () => {
    const books = [
      createBook({ id: 'a' }),
      createBook({ id: 'b' }),
      createBook({ id: 'c' }),
    ];

    expect(findBookIndex(books, 'b')).toBe(1);
  });

  it('returns -1 for non-existent book', () => {
    const books = [createBook({ id: 'a' })];
    expect(findBookIndex(books, 'z')).toBe(-1);
  });

  it('returns -1 for empty array', () => {
    expect(findBookIndex([], 'any')).toBe(-1);
  });
});
```

### Phase 5: Component Smoke Tests
Add basic render tests for critical components.

#### 5.1 Create Test Setup
**File:** `ui/tests/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers
export const handlers = [
  http.get('*/books', () => {
    return HttpResponse.json([
      {
        id: 'test-1',
        title: 'Test Book',
        author: 'Test Author',
        genres: ['LitRPG'],
        rating: 4.5,
        numRatings: 100,
        // ... other required fields
      },
    ]);
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

#### 5.2 Create Carousel Smoke Test
**File:** `ui/tests/components/Carousel.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Carousel } from '../../src/components/Carousel/Carousel';

describe('Carousel', () => {
  const mockBooks = [
    {
      id: 'test-1',
      title: 'Test Book 1',
      author: 'Author 1',
      imageUrl: 'https://example.com/1.jpg',
      // ... minimum required fields
    },
  ];

  it('renders without crashing', () => {
    render(
      <Carousel
        books={mockBooks}
        selectedIndex={0}
        spinState="stopped"
        onBookSelected={() => {}}
        continuousSpin={false}
        onSpinComplete={() => {}}
      />
    );

    // Should render book cards
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
```

#### 5.3 Create FilterMenu Smoke Test
**File:** `ui/tests/components/FilterMenu.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FilterMenu } from '../../src/components/FilterMenu/FilterMenu';
import { EMPTY_FILTERS } from '../../src/api/books';

describe('FilterMenu', () => {
  it('renders collapsed state by default', () => {
    render(
      <FilterMenu
        filters={EMPTY_FILTERS}
        onFiltersChange={() => {}}
        popularityWeight={0}
        onPopularityWeightChange={() => {}}
      />
    );

    expect(screen.getByText(/FILTERS:/i)).toBeInTheDocument();
  });
});
```

---

## Technical Specifications

### Coverage Thresholds
- Backend (Jacoco): 80% line coverage
- Frontend (Vitest): 80% line, function, branch, statement coverage

### Test Categories

| Category | Tool | Files |
|----------|------|-------|
| Backend Integration | JUnit5 + Quarkus | `*Test.kt` |
| Backend GSI (slow) | JUnit5 + @Tag("gsi-integration") | Separate run |
| Frontend Unit | Vitest | `*.test.ts` |
| Frontend Component | Vitest + Testing Library | `tests/components/*.test.tsx` |

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `ui/src/utils/weightedRandom.test.ts` | WeightedRandom algorithm tests |
| `ui/tests/setup.ts` | Vitest test setup with MSW |
| `ui/tests/components/Carousel.test.tsx` | Carousel smoke test |
| `ui/tests/components/FilterMenu.test.tsx` | FilterMenu smoke test |
| `ui/vitest.config.ts` | Vitest configuration with coverage |
| `src/test/kotlin/.../BooksGSIIntegrationTest.kt` | Extracted GSI tests |

### Files to Modify
| File | Changes |
|------|---------|
| `build.gradle.kts` | Add jacoco plugin, coverage thresholds |
| `ui/package.json` | Add coverage scripts and dependencies |
| `Makefile` | Add test-coverage target |
| `src/test/kotlin/.../BooksQueryTest.kt` | Remove 4 disabled tests |

---

## Quality Gates

- `./gradlew test` - All backend tests pass
- `./gradlew jacocoTestCoverageVerification` - 80% coverage met
- `npm run test:run` - All frontend tests pass
- `npm run test:coverage` - 80% coverage met
- `npm run lint` - No linting errors
- `npm run build` - TypeScript compiles

---

## Verification Checklist

### Backend Coverage
1. [ ] Run `./gradlew test jacocoTestReport`
2. [ ] Open `build/reports/jacoco/test/html/index.html`
3. [ ] Verify line coverage >= 80%
4. [ ] Run `./gradlew jacocoTestCoverageVerification` -> passes

### Frontend Coverage
1. [ ] Run `npm run test:coverage`
2. [ ] Open `ui/coverage/index.html`
3. [ ] Verify line coverage >= 80%
4. [ ] weightedRandom.ts shows >90% coverage

### Component Tests
1. [ ] `npm run test:run` runs Carousel.test.tsx
2. [ ] `npm run test:run` runs FilterMenu.test.tsx
3. [ ] Tests pass without errors

---

## Implementation Order

1. Add jacoco plugin to build.gradle.kts
2. Configure coverage thresholds and jacocoTestReport
3. Add Makefile test-coverage target
4. Install @vitest/coverage-v8 in ui/
5. Create ui/vitest.config.ts with coverage settings
6. Update ui/package.json scripts
7. Create ui/tests/setup.ts with MSW
8. Write weightedRandom.test.ts (all test cases)
9. Write Carousel.test.tsx smoke test
10. Write FilterMenu.test.tsx smoke test
11. Extract GSI tests to BooksGSIIntegrationTest.kt
12. Configure test tags in build.gradle.kts
13. Remove @Disabled from BooksQueryTest.kt

---

## Open Questions

- [ ] Should GSI tests run as part of `make test` or separately?
- [ ] Add coverage badges to README?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 80% threshold too high initially | Medium | Start at 60%, increase incrementally |
| MSW setup complex | Low | Use existing patterns from useBooks.test.ts |
| Jacoco slow on native builds | Low | Only run jacoco on JVM builds |
