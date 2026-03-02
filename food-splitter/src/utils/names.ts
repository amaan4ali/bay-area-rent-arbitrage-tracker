import { DEMO_MODE } from "../config";
import { DEMO_USER, DEMO_FRIENDS } from "../demo-data";

const demoNames: Record<string, string> = {
  [DEMO_USER.id]: "You",
  ...Object.fromEntries(DEMO_FRIENDS.map((f) => [f.id, f.displayName])),
};

/**
 * Resolve a userId to a display name.
 * In demo mode, uses the demo data map.
 * In production, you'd look this up from a cache or Firestore.
 */
export function getDisplayName(userId: string, currentUserId?: string): string {
  if (userId === currentUserId) return "You";
  if (DEMO_MODE) return demoNames[userId] || userId;
  return userId; // In production, replace with a user cache lookup
}
