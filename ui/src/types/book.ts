export type BookSource = 'AUDIBLE' | 'ROYAL_ROAD';

export interface Book {
  id: string;
  title: string;
  subtitle: string | null;
  author: string;
  authorUrl: string | null;
  narrator: string | null;
  series: string | null;
  seriesPosition: number | null;
  genres: string[];                 // Book genres (1-5 per book)
  length: string | null;           // Audio length (Audible only)
  releaseDate: string | null;
  language: string;
  imageUrl: string;
  // Source-specific fields
  source: BookSource;
  audibleUrl: string | null;
  audibleAsin: string | null;
  royalRoadUrl: string | null;
  royalRoadId: string | null;
  rating: number;
  numRatings: number;
  pageCount: number | null;        // Royal Road page count
  description: string;
  wishlistCount: number;
  clickThroughCount: number;
  notInterestedCount: number;
  impressionCount: number;
  upvoteCount: number;
  downvoteCount: number;
  addedAt: number;      // Timestamp in millis
  updatedAt: number;    // Timestamp in millis
}
