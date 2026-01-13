export interface Book {
  id: string;
  title: string;
  subtitle: string | null;
  author: string;
  authorUrl: string | null;
  narrator: string | null;
  series: string | null;
  seriesPosition: number | null;
  length: string;
  releaseDate: string;
  language: string;
  imageUrl: string;
  audibleUrl: string;
  audibleAsin: string;
  rating: number;
  numRatings: number;
  description: string;
  wishlistCount: number;
  clickThroughCount: number;
  notInterestedCount: number;
  impressionCount: number;
  addedAt: string;
  updatedAt: string;
}
