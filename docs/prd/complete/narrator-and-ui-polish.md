# PRD: Narrator Support & UI Polish

## Overview

This PRD covers two related features:
1. **Narrator Support** - Add narrator as an optional field with storage, display, filtering, and backfill capabilities
2. **UI Polish** - Restyle action buttons and add author/narrator filter controls

---

## Part 1: Narrator Support

### Goals

1. Store narrator information for audiobooks (optional field, comma-separated for multiple narrators)
2. Display narrator in book cards when available
3. Enable filtering/querying books by narrator via GSI
4. Provide mechanism to backfill narrator data for existing catalog entries

### Current State

- **Scraper**: Parses Audible metadata JSON containing `narrators` array but doesn't extract it
- **Data Models**: No narrator field in `Book`, `ScrapedBook`, `BookEntity`, or TypeScript interface
- **DynamoDB**: No narrator GSI (existing GSIs: `author-index`, `genre-index`, `popularity-index`, `length-index`)
- **UI**: No narrator display or filter option

---

### Requirements

#### 1.1 Data Model Changes

Add `narrator: String?` (optional) to all Book representations:

| Layer | File | Change |
|-------|------|--------|
| Curator | `curator/.../model/ScrapedBook.kt` | Add `narrator: String?` |
| Curator | `curator/.../model/Book.kt` | Add `narrator: String?` |
| Curator | `curator/.../repository/BookRepository.kt` | Add to `BookEntity` |
| Main API | `src/.../books/Book.kt` | Add with GSI annotation |
| UI | `ui/src/types/book.ts` | Add `narrator: string \| null` |

**Multiple narrators**: Store as comma-separated string (e.g., "Nick Podehl, Ray Porter")

#### 1.2 Scraper Enhancement

**File**: `curator/src/.../scraper/AudibleScraper.kt`

Extract narrator from existing metadata JSON:
```kotlin
val narrators = metadataJson?.get("narrators")?.jsonArray
    ?.mapNotNull { it.jsonObject["name"]?.jsonPrimitive?.contentOrNull }
    ?.joinToString(", ")
```

#### 1.3 DynamoDB GSI

**File**: `terraform/modules/dynamodb/main.tf`

Add `narrator-index` GSI:
- **Partition Key**: `narrator` (String)
- **Sort Key**: `rating` (Number, descending)
- **Projection**: ALL

#### 1.4 Backend Query Support

**File**: `src/.../books/BooksService.kt`

Add `getBooksByNarrator(narrator: String, limit: Int)` following `getBooksByAuthor` pattern.

**File**: `src/.../books/RetrieveBooksResource.kt`

Add `@QueryParam("narrator") narrator: String?` parameter.

#### 1.5 UI Display

**Files**: `BookCard.tsx`, `SystemDialog.tsx`

Display narrator below author when present:
```
by {book.author}
narrated by {book.narrator}  // only when narrator exists
```

#### 1.6 Backfill Command

**File**: `curator/src/.../commands/RefreshCommand.kt` (new)

New CLI command to re-scrape and update existing books:

```bash
# Refresh all books (re-scrape from Audible)
./gradlew :curator:run --args="refresh"

# Refresh specific book by ID
./gradlew :curator:run --args="refresh <book-id>"

# Refresh only books missing narrator
./gradlew :curator:run --args="refresh --missing-narrator"

# Dry run to preview changes
./gradlew :curator:run --args="refresh --dry-run"
```

**Behavior**:
1. Fetch book(s) from DynamoDB
2. Re-scrape Audible page using stored `audibleUrl`
3. Extract narrator (and optionally refresh other mutable fields)
4. Update DynamoDB record, preserving metrics (wishlistCount, impressionCount, etc.)
5. Rate-limit requests to avoid Audible blocking (e.g., 1 request/second)

---

## Part 2: UI Polish

### 2.1 Author & Narrator Filters

Add searchable filter options for Author and Narrator to the FilterMenu.

**Files to modify**:
- `ui/src/components/FilterMenu/FilterMenu.tsx` - Add Author and Narrator categories
- `ui/src/api/books.ts` - Add `author?: string` and `narrator?: string` to `BookFilters`

**UX Pattern**: Since authors and narrators aren't enumerable (too many unique values), implement as:
- Text input field with autocomplete/typeahead
- Query API endpoint for matching authors/narrators as user types
- OR fetch distinct values on filter open and filter client-side

**New API endpoints needed**:
- `GET /books/authors` - Returns distinct author names
- `GET /books/narrators` - Returns distinct narrator names

### 2.2 Action Button Restyling

**Problem**: The SystemDialog action buttons (Add to Wishlist, Spin Again, Not Interested) use bright colored borders (green/red) that don't match the FF system dialog aesthetic used elsewhere.

**Current style** (SystemDialog.module.css):
```css
.primary {
  border-color: var(--ff-action-confirm);  /* bright green */
  color: var(--ff-action-confirm);
}
.danger {
  border-color: var(--ff-action-cancel);   /* bright red */
  color: var(--ff-action-cancel);
}
```

**Target style** (like FilterMenu.module.css):
```css
.actionButton {
  background: linear-gradient(180deg, var(--ff-blue-light) 0%, var(--ff-blue-mid) 100%);
  border: 3px solid var(--ff-border-outer);
  color: var(--ff-text-primary);
}
```

**Changes**:
- Remove `.primary` and `.danger` color overrides
- Use consistent FF blue gradient background
- Use `var(--ff-text-highlight)` for hover/active states
- Differentiate buttons by text/icon only, not border color

---

## Implementation Order

### Phase 1 - Data Layer
- [ ] Add narrator field to all data models (Kotlin + TypeScript)
- [ ] Update scraper to extract narrator (comma-separated)
- [ ] Add narrator GSI to Terraform

### Phase 2 - Backend
- [ ] Add narrator query support to BooksService
- [ ] Add narrator param to REST endpoint
- [ ] Add `/books/authors` and `/books/narrators` endpoints

### Phase 3 - UI Display
- [ ] Display narrator in BookCard and SystemDialog
- [ ] Restyle action buttons to match FF theme

### Phase 4 - Backfill
- [ ] Implement `refresh` CLI command
- [ ] Run backfill on existing catalog

### Phase 5 - UI Filters
- [ ] Add Author filter to FilterMenu with search/autocomplete
- [ ] Add Narrator filter to FilterMenu with search/autocomplete

---

## Technical Notes

### Narrator GSI Limitations
DynamoDB GSI partition keys work best with exact matches. For partial/fuzzy search on narrator names, consider:
- Client-side filtering after fetching all books
- Adding a search endpoint that scans with filter expressions
- Future: Elasticsearch/OpenSearch for full-text search

### Rate Limiting for Backfill
Audible may block rapid requests. The refresh command should:
- Add configurable delay between requests (default: 1 second)
- Support resume from last processed book on failure
- Log progress for monitoring
