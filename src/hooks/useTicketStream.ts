"use client";

import { useEffect, useRef, useState } from "react";
import type { TicketStreamItem, SSEInitPayload } from "@/types";

export interface UseTicketStreamOptions {
  /** Called when a new ticket is created */
  onCreated?: (ticket: TicketStreamItem) => void;
  /** Called when an existing ticket is updated */
  onUpdated?: (ticket: TicketStreamItem) => void;
  /** Called on init event with current stats */
  onInit?: (payload: SSEInitPayload) => void;
  /**
   * Set to false to disable the stream (e.g., when user is not on a relevant page).
   * Defaults to true.
   */
  enabled?: boolean;
}

export interface UseTicketStreamResult {
  /** true when EventSource is open and receiving events */
  connected: boolean;
}

/**
 * Client hook for subscribing to real-time ticket updates via SSE.
 *
 * ticket.deleted is intentionally not supported — deleted rows are
 * undetectable via updatedAt polling (see design §3.7).
 *
 * Uses standard browser EventSource which automatically sends
 * Last-Event-ID header on reconnect, enabling back-fill of missed events.
 */
export function useTicketStream(
  options: UseTicketStreamOptions = {}
): UseTicketStreamResult {
  const { onCreated, onUpdated, onInit, enabled = true } = options;

  const [connected, setConnected] = useState(false);
  const toastShownRef = useRef(false);

  // Keep callbacks in refs so stale closure doesn't break handlers
  const onCreatedRef = useRef(onCreated);
  const onUpdatedRef = useRef(onUpdated);
  const onInitRef = useRef(onInit);

  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated]);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    onInitRef.current = onInit;
  }, [onInit]);

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource("/api/v1/tickets/stream");

    es.addEventListener("open", () => {
      setConnected(true);

      // Show "Live updates active" toast on first connect only
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        // Dynamically import sonner to avoid SSR issues
        import("sonner")
          .then(({ toast }) => {
            toast.info("Live updates active", { id: "sse-connected" });
          })
          .catch(() => {/* toast unavailable — silent */});
      }
    });

    es.addEventListener("error", () => {
      setConnected(false);
    });

    es.addEventListener("init", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as SSEInitPayload;
        onInitRef.current?.(payload);
      } catch {
        console.warn("[useTicketStream] failed to parse init event", e.data);
      }
    });

    es.addEventListener("ticket.created", (e: MessageEvent) => {
      try {
        const ticket = JSON.parse(e.data) as TicketStreamItem;
        onCreatedRef.current?.(ticket);
      } catch {
        console.warn("[useTicketStream] failed to parse ticket.created", e.data);
      }
    });

    es.addEventListener("ticket.updated", (e: MessageEvent) => {
      try {
        const ticket = JSON.parse(e.data) as TicketStreamItem;
        onUpdatedRef.current?.(ticket);
      } catch {
        console.warn("[useTicketStream] failed to parse ticket.updated", e.data);
      }
    });

    return () => {
      es.close();
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}
