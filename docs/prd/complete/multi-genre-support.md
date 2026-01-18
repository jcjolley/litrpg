# Multi-Genre Support

## Overview
Replace the single-genre classification system with a multi-genre array (1-5 genres per book), add a comprehensive genre taxonomy based on LitRPG community standards, and migrate all existing books by re-scraping their source pages for fresh context.

## Problem Statement
The current LLM classifies almost everything as "GameLit" because the genre list is incomplete and forces a single choice. Books naturally span multiple subgenres (e.g., a Tower Climb + Time Loop + Cultivation story), and users need accurate multi-dimensional filtering to find books matching their preferences.

## Goals
- [ ] Expand genre taxonomy from 19 to ~30 well-defined categories
- [ ] Support 1-5 genres per book stored as an array
- [ ] Migrate all 200+ existing books with accurate multi-genre classification
- [ ] Update UI to filter by multiple genres (OR logic)
- [ ] Improve LLM genre extraction accuracy
- [ ] Remove 6 of 7 GSIs from DynamoDB (switching to in-memory filtering, keep only `addedAt-index` for sync)

## Non-Goals
- Not implementing AND filtering (all selected genres must match)
- Not adding genre hierarchy (primary vs. secondary) - flat list only
- Not creating new DynamoDB GSIs for genre arrays (using in-memory filtering)
- Not changing the two-pass LLM summarization approach (only modifying Pass 1 prompt)
- Not retiring "GameLit" as a category

---

## User Stories

### US-001: View Multiple Genres on Book Card
**As a** reader browsing the carousel
**I want** to see all genres a book belongs to
**So that** I can quickly assess if it matches my interests

**Acceptance Criteria:**
- [ ] Book cards display up to 5 genre tags
- [ ] Genres are displayed as comma-separated text or tags
- [ ] Long genre lists wrap appropriately on mobile
- [ ] Uncategorized books show no genre tag (not "UNCATEGORIZED")

### US-002: Filter by Multiple Genres
**As a** reader with specific taste
**I want** to include/exclude multiple genres in filters
**So that** I can find books matching any of my preferred subgenres

**Acceptance Criteria:**
- [ ] Filter menu shows all ~30 genres in the GENRE category
- [ ] Clicking a genre cycles through: neutral -> include -> exclude
- [ ] Multiple genres can be selected simultaneously
- [ ] Books matching ANY included genre appear (OR logic)
- [ ] Books matching ANY excluded genre are hidden
- [ ] Filter summary shows all active genre filters

### US-003: Add Book with Multiple Genres
**As a** curator adding new books
**I want** the LLM to assign 1-5 appropriate genres
**So that** books are accurately classified from the start

**Acceptance Criteria:**
- [ ] LLM prompt instructs selection of 1-5 genres from the taxonomy
- [ ] Validation ensures at least 1 genre is assigned
- [ ] Validation ensures no more than 5 genres
- [ ] All assigned genres must be from the valid list
- [ ] "Add" command displays all assigned genres for review

### US-004: Migrate Existing Books
**As a** curator maintaining the catalog
**I want** to re-classify all existing books with the new genre system
**So that** the entire catalog benefits from improved taxonomy

**Acceptance Criteria:**
- [ ] `make migrate-genres` command processes all books in batches
- [ ] Each book's source URL is re-scraped for fresh context
- [ ] A focused genre-only LLM prompt assigns 1-5 genres
- [ ] Progress is displayed showing books processed / total
- [ ] Failed books are logged and skipped (don't block the batch)
- [ ] Summary shows success/failure counts at completion

---

## Phases

### Phase 1: Data Model & GSI Cleanup
Update the data layer to support genre arrays and remove unused GSIs.

#### 1.1 Update Book Models (API)
**File:** `src/main/kotlin/org/jcjolley/books/Book.kt`

Change `genre: String?` to `genres: List<String>`, remove GSI annotations except for `addedAt-index`.

```kotlin
// Remove these GSI annotations:
// - @DynamoDbSecondaryPartitionKey(indexNames = ["author-index"])
// - @DynamoDbSecondaryPartitionKey(indexNames = ["narrator-index"])
// - @DynamoDbSecondaryPartitionKey(indexNames = ["source-index"])
// - @DynamoDbSecondaryPartitionKey(indexNames = ["genre-index"])
// - @DynamoDbSecondaryPartitionKey(indexNames = ["length-index"])
// - @DynamoDbSecondarySortKey(indexNames = ["author-index", "length-index"])
// - @DynamoDbSecondarySortKey(indexNames = ["genre-index", "popularity-index"])

// Keep only:
// - @DynamoDbSecondaryPartitionKey(indexNames = ["addedAt-index"]) on gsiPartition
// - @DynamoDbSecondarySortKey(indexNames = ["addedAt-index"]) on addedAt

// Change:
var genres: List<String> = emptyList(),  // replaces genre: String?
```

#### 1.2 Update Book Models (Curator)
**File:** `curator/src/main/kotlin/org/jcjolley/curator/model/Book.kt`

```kotlin
val genres: List<String> = emptyList(),  // replaces genre: String?
```

Also update `BookFacts`:
```kotlin
val genres: List<String> = emptyList(),  // replaces genre: String?
```

#### 1.3 Update BookEntity (Curator Repository)
**File:** `curator/src/main/kotlin/org/jcjolley/curator/repository/BookRepository.kt`

Update `BookEntity` to store genres as a DynamoDB list.

#### 1.4 Update TypeScript Types
**File:** `ui/src/types/book.ts`

```typescript
export interface Book {
  // ... existing fields ...
  genres: string[];  // replaces genre: string | null
  // ...
}
```

#### 1.5 Remove Unused GSIs
With ~200 books, in-memory filtering is fast enough. Remove 6 of 7 GSIs to simplify the schema and reduce costs. Keep only `addedAt-index` for incremental sync.

**GSIs to remove:**

| GSI | Reason for Removal |
|-----|-------------------|
| `author-index` | Filter in-memory after scan |
| `genre-index` | No longer applicable (switching to array) |
| `popularity-index` | Sort in-memory after scan |
| `length-index` | Filter in-memory after scan |
| `narrator-index` | Filter in-memory after scan |
| `source-index` | Never used in code |

**GSI to keep:**

| GSI | Reason to Keep |
|-----|---------------|
| `addedAt-index` | Used by `getBooksAddedSince()` for incremental sync |

**Files to update:**

| File | Change |
|------|--------|
| `scripts/init-localstack.sh` | Remove 6 GSIs, keep only `addedAt-index` |
| `terraform/main.tf` | Remove 6 GSIs from production table definition |
| `src/main/kotlin/.../books/Book.kt` | Remove GSI annotations (keep only gsiPartition/addedAt for addedAt-index) |
| `src/main/kotlin/.../books/BooksService.kt` | Remove GSI query methods, rewrite for in-memory filtering |

**Safety note:** Per [AWS documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.OnlineOps.html), deleting GSIs is safe - it doesn't affect base table data.

### Phase 2: Genre Taxonomy & LLM Updates
Define the comprehensive genre list and update LLM prompts.

#### 2.1 Define Expanded Genre Taxonomy
**File:** `curator/src/main/kotlin/org/jcjolley/curator/llm/LlamaSummarizer.kt`

Replace `VALID_GENRES` with comprehensive taxonomy:

```kotlin
val VALID_GENRES = setOf(
    // Core Subgenres (what IS the book?)
    "LitRPG",              // Explicit stats, levels, game UI
    "GameLit",             // Game elements, soft stats, less crunchy
    "Progression Fantasy", // Power growth, no game UI
    "Cultivation",         // Eastern martial arts power system
    "Xianxia",             // Chinese immortal cultivation
    "Wuxia",               // Martial arts, minimal supernatural

    // Setting Types
    "System Apocalypse",   // Game system appears in real world
    "Dungeon Core",        // MC is/controls the dungeon
    "Tower Climb",         // Ascending floors of increasing difficulty
    "Dungeon Diving",      // Exploring dungeons as adventurer
    "Post-Apocalyptic",    // After civilization collapse
    "Virtual Reality",     // VR/VRMMO game setting

    // Narrative Structures
    "Isekai",              // Transported to another world
    "Portal Fantasy",      // Gateway to fantasy world (Western isekai)
    "Reincarnation",       // Reborn in new body/world
    "Regression",          // Second chance with future knowledge
    "Time Loop",           // Repeating time period

    // Gameplay/Mechanics Focus
    "Monster Evolution",   // MC evolves as non-human
    "Base Building",       // Constructing settlements/bases
    "Kingdom Building",    // Managing territories/nations
    "Crafting",            // Item creation focus
    "Deck Building",       // Card-based magic/combat system
    "Summoner",            // Controlling minions/creatures

    // Tone/Style
    "Dark Fantasy",        // Gritty, morally gray, high stakes
    "Slice of Life",       // Low-stakes daily life focus
    "Comedy",              // Humor-focused narrative
    "Harem",               // Multiple romantic interests

    // Setting/Theme
    "Academy",             // School/training institution setting
    "Military",            // Organized warfare focus
    "Solo Leveling",       // Lone wolf power fantasy (weak-to-strong)
    "Party-Based",         // Team/group adventure focus
)
```

#### 2.2 Update Pass 1 Extraction Prompt
**File:** `curator/src/main/kotlin/org/jcjolley/curator/llm/LlamaSummarizer.kt`

Modify the extraction prompt to request multiple genres.

#### 2.3 Update Validation Logic
Add validation for 1-5 genres, all from valid list.

### Phase 3: API & Query Updates
Update the API to handle genre arrays and implement in-memory filtering.

#### 3.1 Update BooksService
**File:** `src/main/kotlin/org/jcjolley/books/BooksService.kt`

- Remove `getBooksByAuthor()`, `getBooksByGenre()`, `getBooksByPopularity()`, `getBooksByLength()`, `getBooksByNarrator()`
- Keep `getBooksAddedSince()` (uses addedAt-index)
- Rewrite `queryBooks()` for in-memory filtering

#### 3.2 Update REST Endpoint
**File:** `src/main/kotlin/org/jcjolley/books/RetrieveBooksResource.kt`

Change `genre` query param to `genres` (comma-separated).

### Phase 4: UI Updates
Update the React frontend to display and filter by multiple genres.

### Phase 5: Migration Command
Create `make migrate-genres` command to re-classify all existing books.

---

## Technical Specifications

### Genre Taxonomy (30 categories)

| Category | Genres |
|----------|--------|
| Core Subgenres | LitRPG, GameLit, Progression Fantasy, Cultivation, Xianxia, Wuxia |
| Settings | System Apocalypse, Dungeon Core, Tower Climb, Dungeon Diving, Post-Apocalyptic, Virtual Reality |
| Narrative | Isekai, Portal Fantasy, Reincarnation, Regression, Time Loop |
| Mechanics | Monster Evolution, Base Building, Kingdom Building, Crafting, Deck Building, Summoner |
| Tone/Style | Dark Fantasy, Slice of Life, Comedy, Harem |
| Theme | Academy, Military, Solo Leveling, Party-Based |

### API Changes

**Query Parameter Change:**
- Before: `GET /books?genre=Cultivation`
- After: `GET /books?genres=Cultivation,Tower+Climb`

**Response Change:**
```json
{
  "id": "abc123",
  "title": "Example Book",
  "genres": ["Cultivation", "Tower Climb", "Time Loop"]
}
```

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `curator/src/main/kotlin/.../commands/MigrateGenresCommand.kt` | Batch migration CLI command |

### Files to Modify
| File | Changes |
|------|---------|
| `curator/src/main/kotlin/.../model/Book.kt` | `genre: String?` -> `genres: List<String>` |
| `curator/src/main/kotlin/.../repository/BookRepository.kt` | Update entity mapping for list field |
| `curator/src/main/kotlin/.../llm/LlamaSummarizer.kt` | Expand taxonomy, update prompts |
| `curator/src/main/kotlin/.../commands/AddCommand.kt` | Display multiple genres in review |
| `src/main/kotlin/.../books/Book.kt` | `genre: String?` -> `genres: List<String>`, remove GSI annotations |
| `src/main/kotlin/.../books/BooksService.kt` | Remove GSI methods, in-memory filtering |
| `terraform/main.tf` | Remove 6 GSIs, keep only `addedAt-index` |
| `src/main/kotlin/.../books/RetrieveBooksResource.kt` | Update query param handling |
| `ui/src/types/book.ts` | `genre: string | null` -> `genres: string[]` |
| `ui/src/components/FilterMenu/FilterMenu.tsx` | Expand GENRES list to ~30 |
| `ui/src/components/Carousel/BookCard.tsx` | Display multiple genre tags |
| `ui/src/api/books.ts` | Update genre filter serialization |
| `scripts/init-localstack.sh` | Remove 6 GSIs, keep only `addedAt-index` |
| `Makefile` | Add migrate-genres target |

---

## Quality Gates

- `make build` - All modules compile
- `make test` - All tests pass
- API returns `genres: []` for books without classification
- UI gracefully handles empty genres array

---

## Open Questions

- [x] How many genres per book? -> 1-5 flat list
- [x] AND vs OR filtering? -> OR (any match)
- [x] Keep or retire GameLit? -> Keep as fallback
- [x] Migration approach? -> Re-scrape source URLs
- [x] GSI strategy? -> In-memory filtering (remove 6 GSIs, keep addedAt-index)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM still defaults to GameLit | Medium | Prompt instructs "only use when specifics don't fit" |
| Scraping fails for old URLs | Low | Log failures, continue batch, manual review |
| 30 genres overwhelms filter UI | Low | Alphabetical scroll, search box if needed |
| In-memory filtering too slow | Low | 200 books is tiny; cache if needed later |
| DynamoDB list size limit | Low | 5 genres x ~20 chars = 100 bytes, well under limits |
