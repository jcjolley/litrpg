# UI - Recommendation Spinner

React + TypeScript app with retro RPG aesthetics (SNES Final Fantasy-inspired).

## User Flow

1. Page loads → carousel auto-spins
2. Carousel slows and stops on weighted random book
3. System dialog shows: cover, title, AI-generated 2-sentence blurb
4. User actions:
   - **Wishlist** - saves to localStorage
   - **Spin Again** - new spin
   - **Ignore** - dismiss
   - **Click elsewhere** - opens Audible page

## Visual Style

- Blue gradient dialog boxes (classic FF style)
- White/light borders
- Pixel/retro font for system text
- Book covers prominently displayed

## Tech

- React + TypeScript
- Deployed to S3 + CloudFront
- Calls `/books` API for catalog data

## Recommendation Algorithm

Weighted random selection based on:
- `wishlistCount`
- `impressions`
- `clickThroughCount`

## Commands

```bash
cd ui
npm run dev      # Local development
npm run build    # Production build
npm run test     # Run tests
```
