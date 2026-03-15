import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function generateTrackingId(): string {
  return `FB-${nanoid()}`;
}

export function generateTrackingIdWithRetry(maxAttempts = 3): () => string {
  let attempt = 0;
  return function generate(): string {
    if (attempt >= maxAttempts) throw new Error("Failed to generate unique tracking ID");
    attempt++;
    return generateTrackingId();
  };
}
