export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: number;  // epoch millis
  upvoteCount: number;
  downvoteCount: number;
}
