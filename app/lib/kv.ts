'use server';

import { Redis } from '@upstash/redis';

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error('Missing Upstash Redis environment variables');
}

const ROOT_KEY_PREFIX = "codaCalls-occasion:";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Helper function to generate the Redis key for an occasion
function getOccasionKey(rowId: string, occasionId: string): string {
  return `${ROOT_KEY_PREFIX}${rowId}-${occasionId}`;
}

// Helper function to check if an occasion has been logged
export async function isOccasionLogged(rowId: string, occasionId: string): Promise<boolean> {
  const occasionHash = getOccasionKey(rowId, occasionId);
  const result = await redis.get(occasionHash);
  return result !== null;
}

// Helper function to mark an occasion as logged
export async function markOccasionAsLogged(rowId: string, occasionId: string): Promise<void> {
  const occasionHash = getOccasionKey(rowId, occasionId);
  // Store with a TTL of 90 days (in seconds)
  await redis.set(occasionHash, true, { ex: 90 * 24 * 60 * 60 });
} 