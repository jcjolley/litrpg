# Support Links in Settings Panel

## Phase Status
- [x] Discovery
- [x] PRD Draft
- [x] PRD Review
- [x] Implementation
- [ ] E2E Tests
- [x] Quality Gates
- [x] Code Review
- [x] Smoke Testing
- [x] Commit
- [x] Deploy
- [ ] Retrospective

## Overview
Add a "SUPPORT THE GUILD" section to the SettingsPanel with a Patreon tip jar link and an Audible free trial affiliate link. RPG-themed copy, matching existing visual style.

## Problem Statement
The LitRPG spinner has no effective monetization. Audible affiliate links only earn $0.50 per retail purchase, but users buy with credits (no commission). The app needs a direct support mechanism (Patreon) and an Audible trial signup link ($5 bounty per new member).

## Goals
- [ ] Add Patreon link to SettingsPanel for direct creator support
- [ ] Add Audible free trial affiliate link for membership bounty revenue
- [ ] Maintain RPG aesthetic — not an ad, feels like part of the game UI

## Non-Goals
- Not changing existing per-book affiliate links (they work fine for trial signups)
- Not adding a new component — reuse existing SettingsPanel section pattern
- Not adding new CSS classes — reuse `externalLink`, `infoText`, `disclaimer`, `sectionHeader`
- Not adding pop-ups, banners, or interstitials

---

## User Stories

### US-001: Support Section Visibility
**As a** LitRPG spinner user
**I want** to see a subtle support section in settings
**So that** I can support the creator if I choose to

**Acceptance Criteria:**
- [ ] "SUPPORT THE GUILD" section appears below "LOOKING FOR MORE?" in SettingsPanel
- [ ] Section uses same visual pattern as existing sections (sectionHeader + infoText)
- [ ] Section is not visible outside of settings panel (no pop-ups, no homepage banners)

### US-002: Patreon Link
**As a** user who wants to support the creator
**I want** a Patreon link with RPG-flavored copy
**So that** I can contribute directly

**Acceptance Criteria:**
- [ ] Link goes to `https://patreon.com/jcjolley`
- [ ] Opens in new tab
- [ ] Link text reads "Buy me a potion" (Patreon)
- [ ] Link appears in yellow highlight matching existing external links

### US-003: Audible Trial Link
**As a** user who doesn't have Audible
**I want** an Audible free trial link
**So that** I can start listening to recommended books

**Acceptance Criteria:**
- [ ] Link goes to `https://www.amazon.com/hz/audible/mlp/membership/premiumplus?tag=jolleyboy-20`
- [ ] Opens in new tab with `rel="noopener noreferrer"`
- [ ] Link text reads "Try Audible free"
- [ ] Disclaimer below links reads "Audible link is an affiliate link — we may earn a small commission."

---

## Technical Specifications

### Files to Modify
| File | Changes |
|------|---------|
| `ui/src/components/SettingsPanel/SettingsPanel.tsx` | Add new section JSX below "LOOKING FOR MORE?" |

### Data Models (TypeScript)
- No new shared interfaces. Existing `UserSettings` (from `ui/src/hooks/useSettings.ts`) remains unchanged.
- Support links can be static JSX; if a local structure is preferred, keep it component-scoped (not exported).

### API Changes
- None. Static external anchors only; no backend or `/api` changes.

### State Management
- No new state. `SettingsPanel` continues to render only when `isOpen` is true (toggled in `ui/src/App.tsx`).
- No changes to settings persistence (`useSettings` + `localStorage`).

### UI Structure
- Reuse existing `SettingsPanel.module.css` classes: `section`, `sectionHeader`, `infoText`, `externalLink`, `disclaimer`.
- Insert the new `<div className={styles.section}>` immediately after the "LOOKING FOR MORE?" section.

### Implementation Detail
Add a new `<div className={styles.section}>` block after the existing recommendation section. Pattern matches the "LOOKING FOR MORE?" section:
- `sectionHeader` for "SUPPORT THE GUILD"
- `infoText` containing two `externalLink` anchors (Patreon + Audible)
- `disclaimer` for affiliate disclosure

---

## Test Specifications
- AC: "SUPPORT THE GUILD" section appears below "LOOKING FOR MORE?" in SettingsPanel → Test: render `SettingsPanel` with `isOpen={true}` and assert the support header appears after the "LOOKING FOR MORE?" header in DOM order.
- AC: Section uses same visual pattern as existing sections (sectionHeader + infoText) → Test: assert the support header has class `styles.sectionHeader` and its copy container uses `styles.infoText` (import from `SettingsPanel.module.css`).
- AC: Section is not visible outside of settings panel (no pop-ups, no homepage banners) → Test: render `SettingsPanel` with `isOpen={false}` and assert "SUPPORT THE GUILD" is not in the document.
- AC: Link goes to `https://patreon.com/jcjolley` → Test: assert an anchor exists with that `href`.
- AC: Opens in new tab with `rel="noopener noreferrer"` → Test: Patreon link has `target="_blank"` and `rel="noopener noreferrer"`.
- AC: Uses RPG-themed copy (e.g., "Buy me a potion") → Test: assert Patreon link text matches the chosen RPG-themed phrase (e.g., contains "potion").
- AC: Uses existing `externalLink` CSS class (yellow highlight) → Test: Patreon link has class `styles.externalLink`.
- AC: Link goes to `https://www.amazon.com/hz/audible/mlp/membership/premiumplus?tag=jolleyboy-20` → Test: assert an anchor exists with that `href`.
- AC: Opens in new tab with `rel="noopener noreferrer"` → Test: Audible link has `target="_blank"` and `rel="noopener noreferrer"`.
- AC: Uses approachable copy (e.g., "Try Audible free") → Test: assert Audible link text matches the chosen approachable phrase.
- AC: Disclaimer notes it's an affiliate link → Test: support section includes a `styles.disclaimer` element containing the word "affiliate".

---

## Worker Decomposition

**Single worker (W1):** Add the JSX section to SettingsPanel.tsx. No parallelization needed.

---

## Quality Gates

- `cd ui && npm run build` — Build succeeds
- `cd ui && npx tsc --noEmit` — Type checking passes

---

## Verification Checklist

- [ ] Open Settings panel → "SUPPORT THE GUILD" section appears directly below "LOOKING FOR MORE?"
- [ ] Compare section styling → Support header and body text match existing sectionHeader/infoText styling
- [ ] Close Settings panel / view main screen → Support section is not visible outside settings
- [ ] Review Patreon link copy → RPG-themed phrasing is used and link appears with yellow `externalLink` styling
- [ ] Click Patreon link → Opens `https://patreon.com/jcjolley` in a new tab
- [ ] Review Audible link copy → Approachable phrasing is used for the free trial
- [ ] Click Audible link → Opens the Amazon Audible trial URL with `tag=jolleyboy-20` in a new tab
- [ ] Check disclosure text → Disclaimer mentions the link is an affiliate link

---

## Exploration Notes
- Existing pattern: `ui/src/components/SettingsPanel/SettingsPanel.tsx` already has a "LOOKING FOR MORE?" section using `styles.sectionHeader`, `styles.infoText`, `styles.externalLink`, and `styles.disclaimer`. The support section should mirror this structure and placement.
- Styling: `ui/src/components/SettingsPanel/SettingsPanel.module.css` defines `section`, `sectionHeader`, `infoText`, `externalLink`, `disclaimer` (no new CSS needed).
- Visibility: `SettingsPanel` renders `null` when `isOpen` is false and is mounted only from `ui/src/App.tsx`, so visibility is controlled entirely by the settings toggle.
- Types: `SettingsPanel` already uses `import type` for `UserSettings`; keep type-only imports consistent with `verbatimModuleSyntax`.
- Tests: UI tests use Vitest + React Testing Library with jsdom (`ui/tests/setup.ts`). Existing examples live in `ui/tests/hooks/useBooks.test.ts` and `ui/src/utils/seriesGrouping.test.ts`. Component tests should live under `ui/tests/components/SettingsPanel.test.tsx`.
- Commands: project conventions prefer `make test-ui`, `make typecheck-ui`, and `make build` over raw npm commands.

---

## Lessons Learned
<!-- Filled after implementation -->

---

## Open Questions
None — all decisions made during discovery conversation.

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Patreon URL changes | Low | User can update .tsx directly; it's just a string |
| Amazon changes affiliate link format | Low | Same — just a URL string to update |
