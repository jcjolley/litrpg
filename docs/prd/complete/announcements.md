# Announcements Feature

## Overview
Add an announcements system to communicate updates, new features, and fixes to users via a bell icon button with unread badge and a side panel displaying announcement cards with voting.

## Problem Statement
Users have no way to learn about app changes, new features, or improvements after deployment. This creates a disconnect between development efforts and user awareness.

## Goals
- [ ] Allow admins to publish announcements via curator CLI
- [ ] Display announcements to users with unread tracking
- [ ] Collect user feedback via voting (+1/-1) stored in DynamoDB
- [ ] Gamify engagement with a "Town Crier" achievement

## Non-Goals
- Not building rich media support (images, markdown) - text only
- Not building an admin web UI for announcements
- Not implementing push notifications
- Not adding announcement categories/filtering in MVP
- Not building announcement expiry/archival

---

## User Stories

### US-001: View Announcements
**As a** user
**I want** to see a bell icon near the filter bar that opens an announcements panel
**So that** I can stay informed about app updates and changes

**Acceptance Criteria:**
- [ ] Bell icon button appears to the right of the filter bar
- [ ] Clicking bell opens a right-side slide panel
- [ ] Panel displays announcements sorted by date (newest first)
- [ ] Each announcement shows: title, body text, date, vote score
- [ ] Clicking outside panel or X button closes it

### US-002: Unread Badge
**As a** user
**I want** to see a badge showing unread announcement count
**So that** I know when new announcements are available

**Acceptance Criteria:**
- [ ] Red circle badge appears on bell icon when unread count > 0
- [ ] Badge shows numeric count of unread announcements
- [ ] Opening the panel marks all announcements as read
- [ ] Badge disappears when unread count becomes 0
- [ ] Read state persists across page refreshes (localStorage)

### US-003: Vote on Announcements
**As a** user
**I want** to upvote or downvote announcements
**So that** I can provide feedback on updates

**Acceptance Criteria:**
- [ ] Each announcement card has +1 and -1 buttons
- [ ] Score displays between buttons (e.g., "+5", "-2")
- [ ] Clicking +1 when not voted records upvote
- [ ] Clicking -1 when not voted records downvote
- [ ] Clicking same vote again does nothing (no toggle)
- [ ] User's vote is visually highlighted (same style as book cards)
- [ ] Vote state persists locally and syncs to DynamoDB

### US-004: Create Announcement (Curator)
**As an** admin
**I want** to create announcements via the curator CLI
**So that** I can publish updates without code changes

**Acceptance Criteria:**
- [ ] New `announce` command in curator CLI
- [ ] Command accepts title and body as arguments
- [ ] Announcement stored in DynamoDB with unique ID and timestamp
- [ ] Command confirms success with announcement ID

### US-005: Town Crier Achievement
**As a** user
**I want** to unlock an achievement for reading announcements
**So that** I'm rewarded for staying informed

**Acceptance Criteria:**
- [ ] "Town Crier" achievement unlocks after reading 5 announcements
- [ ] Achievement displays in StatsPanel with other achievements
- [ ] Achievement notification appears on unlock
- [ ] Progress tracked in localStorage stats

---

## Phases

### Phase 1: Data Layer (DynamoDB + API)
Establish the backend infrastructure for storing and retrieving announcements.

#### 1.1 Announcement Entity
**File:** `src/main/kotlin/org/jcjolley/books/Announcement.kt`

```kotlin
@DynamoDbBean
data class Announcement(
    @get:DynamoDbPartitionKey
    var id: String = "",
    var title: String = "",
    var body: String = "",
    var createdAt: Long = 0,  // epoch millis
    var upvoteCount: Int = 0,
    var downvoteCount: Int = 0,
)
```

#### 1.2 Announcement Service
**File:** `src/main/kotlin/org/jcjolley/books/AnnouncementService.kt`

- `listAnnouncements(): List<Announcement>` - scan all, sorted by createdAt desc
- `getAnnouncement(id: String): Announcement?` - single lookup
- `incrementUpvote(id: String): Boolean` - add to upvoteCount
- `incrementDownvote(id: String): Boolean` - add to downvoteCount

#### 1.3 Announcement REST Resource
**File:** `src/main/kotlin/org/jcjolley/books/AnnouncementResource.kt`

```kotlin
@Path("/announcements")
class AnnouncementResource(private val service: AnnouncementService) {
    @GET
    fun list(): List<Announcement>

    @POST @Path("/{id}/upvote")
    fun upvote(@PathParam("id") id: String): Response

    @POST @Path("/{id}/downvote")
    fun downvote(@PathParam("id") id: String): Response
}
```

#### 1.4 DynamoDB Table (Terraform)
**File:** `terraform/modules/dynamodb/main.tf`

Add `litrpg-announcements-dev` table:
- Partition key: `id` (String)
- No GSIs needed (small dataset, scan is fine)

### Phase 2: Curator CLI Command
Add the `announce` command for creating announcements.

#### 2.1 Announcement Repository (Curator)
**File:** `curator/src/main/kotlin/org/jcjolley/curator/repository/AnnouncementRepository.kt`

Follow `BookRepository` pattern:
- `save(announcement: Announcement)`
- `findAll(): List<Announcement>`

#### 2.2 Announce Command
**File:** `curator/src/main/kotlin/org/jcjolley/curator/commands/AnnounceCommand.kt`

```kotlin
class AnnounceCommand : CliktCommand(name = "announce") {
    private val title by argument(help = "Announcement title")
    private val body by argument(help = "Announcement body text")
    private val dynamoEndpoint by option("--dynamo")

    override fun run() {
        val repo = AnnouncementRepository(dynamoEndpoint)
        val announcement = Announcement(
            id = UUID.randomUUID().toString(),
            title = title,
            body = body,
            createdAt = Instant.now().toEpochMilli()
        )
        repo.save(announcement)
        echo("Created announcement: ${announcement.id}")
    }
}
```

#### 2.3 Register Command
**File:** `curator/src/main/kotlin/org/jcjolley/curator/Main.kt`

Add `AnnounceCommand()` to `.subcommands()`

#### 2.4 Makefile Target
**File:** `Makefile`

```makefile
announce:  ## Create announcement: make announce TITLE="title" BODY="body"
	$(GRADLE_CURATOR) run --args="announce '$(TITLE)' '$(BODY)'"
```

### Phase 3: UI - Announcements Hook & API
Build the data fetching and state management layer.

#### 3.1 API Types
**File:** `ui/src/types.ts`

```typescript
export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: number;  // epoch millis
  upvoteCount: number;
  downvoteCount: number;
}
```

#### 3.2 API Functions
**File:** `ui/src/api.ts`

```typescript
export async function fetchAnnouncements(): Promise<Announcement[]>
export async function recordAnnouncementUpvote(id: string): Promise<void>
export async function recordAnnouncementDownvote(id: string): Promise<void>
```

#### 3.3 Announcements Hook
**File:** `ui/src/hooks/useAnnouncements.ts`

```typescript
const ANNOUNCEMENTS_READ_KEY = 'litrpg-announcements-read';
const ANNOUNCEMENTS_VOTES_KEY = 'litrpg-announcement-votes';

interface UseAnnouncementsResult {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  markAllRead: () => void;
  getVote: (id: string) => 'up' | 'down' | null;
  vote: (id: string, direction: 'up' | 'down') => void;
  readCount: number;  // for achievement tracking
}
```

### Phase 4: UI - Components
Build the visual components.

#### 4.1 Announcements Button
**File:** `ui/src/components/AnnouncementsButton/AnnouncementsButton.tsx`

- Bell icon (pixel art or Unicode 🔔)
- Red badge overlay with count
- onClick handler to open panel

**File:** `ui/src/components/AnnouncementsButton/AnnouncementsButton.module.css`

- Position relative for badge
- Badge: absolute positioned, red background, white text
- Pulse animation when unread > 0

#### 4.2 Announcements Panel
**File:** `ui/src/components/AnnouncementsPanel/AnnouncementsPanel.tsx`

Follow `WishlistPanel` pattern:
- Fixed right side, 400px width (100vw mobile)
- Backdrop click to close
- Header: "ANNOUNCEMENTS" + close button
- List of AnnouncementCard components
- Empty state: "No announcements yet"

**File:** `ui/src/components/AnnouncementsPanel/AnnouncementsPanel.module.css`

- Slide-in animation from right
- FF3 blue gradient styling
- Scrollable content area

#### 4.3 Announcement Card
**File:** `ui/src/components/AnnouncementsPanel/AnnouncementCard.tsx`

- Title (bold, larger)
- Body text (wrapped)
- Date (formatted, muted color)
- Vote buttons (+1 / score / -1) in top-right corner
- Same vote button styling as BookCard

### Phase 5: Integration & Achievement
Wire everything together in App.tsx.

#### 5.1 Add Achievement Definition
**File:** `ui/src/hooks/useAchievements.ts`

```typescript
townCrier: {
  id: 'townCrier',
  title: 'TOWN CRIER',
  subtitle: 'Hear Ye, Hear Ye!',
  description: 'Read 5 announcements to stay informed',
  effect: 'You feel more connected to the realm',
  effectType: 'feature',
},
```

Add `announcementsRead: number` to stats tracking.

#### 5.2 App Integration
**File:** `ui/src/App.tsx`

- Add announcements state and hook usage
- Add AnnouncementsButton next to FilterMenu
- Add AnnouncementsPanel with open/close state
- Track announcement reads for achievement
- Unlock townCrier when readCount >= 5

#### 5.3 Stats Panel Integration
**File:** `ui/src/components/StatsPanel/StatsPanel.tsx`

Add townCrier to achievement progress tracking:
```typescript
townCrier: { current: announcementsRead, target: 5, label: 'announcements' },
```

### Phase 6: Infrastructure & Testing
Deploy infrastructure and verify.

#### 6.1 Terraform Apply
Create the DynamoDB table via `make deploy-infra`

#### 6.2 LocalStack Init Script
**File:** `scripts/init-localstack.sh`

Add announcements table creation for local dev.

---

## Technical Specifications

### Data Models

**Announcement (Backend)**
```kotlin
@DynamoDbBean
data class Announcement(
    @get:DynamoDbPartitionKey
    var id: String = "",
    var title: String = "",
    var body: String = "",
    var createdAt: Long = 0,
    var upvoteCount: Int = 0,
    var downvoteCount: Int = 0,
)
```

**Announcement (Frontend)**
```typescript
interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  upvoteCount: number;
  downvoteCount: number;
}
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/announcements` | List all announcements |
| POST | `/announcements/{id}/upvote` | Record upvote |
| POST | `/announcements/{id}/downvote` | Record downvote |

### State Management

**localStorage Keys:**
| Key | Type | Purpose |
|-----|------|---------|
| `litrpg-announcements-read` | `string[]` | IDs of read announcements |
| `litrpg-announcement-votes` | `{ [id]: 'up' \| 'down' }` | User votes per announcement |

**Achievement Stats Addition:**
```typescript
stats: {
  // ... existing
  announcementsRead: number;  // NEW: count for Town Crier achievement
}
```

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/kotlin/org/jcjolley/books/Announcement.kt` | DynamoDB entity |
| `src/main/kotlin/org/jcjolley/books/AnnouncementService.kt` | Business logic |
| `src/main/kotlin/org/jcjolley/books/AnnouncementResource.kt` | REST endpoints |
| `curator/src/main/kotlin/.../repository/AnnouncementRepository.kt` | Curator DDB access |
| `curator/src/main/kotlin/.../commands/AnnounceCommand.kt` | CLI command |
| `ui/src/hooks/useAnnouncements.ts` | React hook for announcements |
| `ui/src/components/AnnouncementsButton/AnnouncementsButton.tsx` | Bell button |
| `ui/src/components/AnnouncementsButton/AnnouncementsButton.module.css` | Button styles |
| `ui/src/components/AnnouncementsPanel/AnnouncementsPanel.tsx` | Panel component |
| `ui/src/components/AnnouncementsPanel/AnnouncementsPanel.module.css` | Panel styles |
| `ui/src/components/AnnouncementsPanel/AnnouncementCard.tsx` | Card component |

### Files to Modify
| File | Changes |
|------|---------|
| `terraform/modules/dynamodb/main.tf` | Add announcements table |
| `scripts/init-localstack.sh` | Add announcements table creation |
| `curator/src/main/kotlin/.../Main.kt` | Register AnnounceCommand |
| `Makefile` | Add `announce` target |
| `ui/src/types.ts` | Add Announcement type |
| `ui/src/api.ts` | Add announcement API functions |
| `ui/src/hooks/useAchievements.ts` | Add townCrier achievement + stats |
| `ui/src/App.tsx` | Integrate announcements button/panel |
| `ui/src/components/StatsPanel/StatsPanel.tsx` | Add townCrier progress |

---

## Quality Gates

- `make test` - All backend tests pass
- `cd ui && npm run typecheck` - UI type checking passes
- `cd ui && npm run lint` - No linting errors
- `cd ui && npm run build` - UI build succeeds
- `make build` - Full build succeeds

---

## Verification Checklist

### Curator CLI
1. [ ] `make announce TITLE="Test" BODY="Hello world"` creates announcement
2. [ ] Running command again creates a second announcement with different ID

### API
3. [ ] `GET /announcements` returns list sorted by createdAt desc
4. [ ] `POST /announcements/{id}/upvote` increments upvoteCount
5. [ ] `POST /announcements/{id}/downvote` increments downvoteCount

### UI - Button & Badge
6. [ ] Bell icon appears next to filter bar
7. [ ] Badge shows count when unread > 0
8. [ ] Badge hidden when unread = 0
9. [ ] Badge pulses subtly to draw attention

### UI - Panel
10. [ ] Clicking bell opens right-side panel
11. [ ] Panel shows announcements newest first
12. [ ] Clicking backdrop closes panel
13. [ ] Clicking X button closes panel
14. [ ] Empty state shows when no announcements

### UI - Voting
15. [ ] +1 button records upvote (visual feedback)
16. [ ] -1 button records downvote (visual feedback)
17. [ ] Score displays correctly with +/- prefix
18. [ ] Vote persists after page refresh

### UI - Read Tracking
19. [ ] Opening panel marks all as read
20. [ ] Badge count updates after marking read
21. [ ] Read state persists after refresh

### Achievement
22. [ ] After reading 5 announcements, "Town Crier" unlocks
23. [ ] Achievement notification appears
24. [ ] Achievement shows in StatsPanel

### Mobile
25. [ ] Panel takes full width on mobile (<768px)
26. [ ] Button and badge visible and tappable
27. [ ] Announcements readable and scrollable

---

## Implementation Order

1. Terraform: Add announcements DynamoDB table
2. LocalStack script: Add table for local dev
3. Backend entity: `Announcement.kt`
4. Backend service: `AnnouncementService.kt`
5. Backend resource: `AnnouncementResource.kt`
6. Curator repository: `AnnouncementRepository.kt`
7. Curator command: `AnnounceCommand.kt` + register in Main.kt
8. Makefile: Add `announce` target
9. UI types: Add `Announcement` interface
10. UI API: Add announcement fetch/vote functions
11. UI hook: `useAnnouncements.ts`
12. UI button: `AnnouncementsButton` component
13. UI panel: `AnnouncementsPanel` + `AnnouncementCard` components
14. UI achievement: Add `townCrier` to useAchievements
15. UI integration: Wire up in App.tsx
16. UI stats: Add progress tracking in StatsPanel

---

## Open Questions

- [x] Icon style - **Bell, icon only**
- [x] Voting backend - **Yes, DynamoDB like books**
- [x] Achievement - **Yes, "Town Crier" at 5 reads**
- [x] Content format - **Text only**

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| DynamoDB scan for all announcements | Low | Small dataset (<100 items), scan is fine |
| Vote spam | Low | Same pattern as books - one vote per user tracked in localStorage |
| localStorage quota | Low | Storing only IDs, minimal footprint |
