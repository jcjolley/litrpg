// Affiliate configuration
// Set VITE_AFFILIATE_TAG in your .env file (e.g., .env.production)
// Example: VITE_AFFILIATE_TAG=your-associate-id-20
export const AFFILIATE_TAG = import.meta.env.VITE_AFFILIATE_TAG || '';

/**
 * Transforms an Audible URL to include the affiliate tag.
 * If no affiliate tag is configured, returns the original URL.
 */
export function getAffiliateUrl(audibleUrl: string): string {
  if (!AFFILIATE_TAG || !audibleUrl) {
    return audibleUrl;
  }

  try {
    const url = new URL(audibleUrl);
    url.searchParams.set('tag', AFFILIATE_TAG);
    return url.toString();
  } catch {
    // If URL parsing fails, return original
    return audibleUrl;
  }
}
