import { fetchApi } from './client';
import type { Announcement } from '../types/announcement';

export async function getAnnouncements(): Promise<Announcement[]> {
  return fetchApi<Announcement[]>('/announcements');
}

export async function recordAnnouncementUpvote(id: string): Promise<void> {
  return fetchApi<void>(`/announcements/${id}/upvote`, {
    method: 'POST',
  });
}

export async function recordAnnouncementDownvote(id: string): Promise<void> {
  return fetchApi<void>(`/announcements/${id}/downvote`, {
    method: 'POST',
  });
}
