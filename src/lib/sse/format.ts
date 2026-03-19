// SSE wire-format helpers — pure functions, no side effects

export const STREAM_POLL_INTERVAL_MS = 3_000;
export const STREAM_KEEPALIVE_INTERVAL_MS = 15_000;

/**
 * Serialize a named SSE event with an ID.
 * Format per spec:
 *   id: <id>\n
 *   event: <event>\n
 *   data: <json>\n\n
 */
export function formatSSEEvent(
  id: string,
  event: string,
  data: unknown
): string {
  const json = JSON.stringify(data);
  return `id: ${id}\nevent: ${event}\ndata: ${json}\n\n`;
}

/**
 * SSE retry hint — sent once on init to configure client reconnect delay.
 */
export function formatSSERetry(ms: number): string {
  return `retry: ${ms}\n\n`;
}

/**
 * SSE keepalive comment — browser EventSource ignores comment lines.
 * Prevents proxy timeout on idle connections.
 */
export function formatSSEComment(comment: string): string {
  return `: ${comment}\n\n`;
}
