import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function generateTrackingId(): string {
  return `FB-${nanoid()}`;
}
