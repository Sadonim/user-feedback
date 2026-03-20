import { type NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAuth } from "@/lib/api/require-auth";
import { unauthorized } from "@/lib/api/response";
import { getTicketStats } from "@/server/services/ticket-stats";
import {
  formatSSEEvent,
  formatSSEComment,
  formatSSERetry,
  STREAM_POLL_INTERVAL_MS,
  STREAM_KEEPALIVE_INTERVAL_MS,
} from "@/lib/sse/format";
import type { TicketStreamItem, SSEInitPayload, TicketDeletedPayload } from "@/types";

// Vercel Hobby limit; increase to 300 on Pro
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TICKET_STREAM_SELECT = {
  id: true,
  trackingId: true,
  title: true,
  type: true,
  status: true,
  priority: true,
  assigneeId: true,
  updatedAt: true,
  createdAt: true,
} as const;

/**
 * GET /api/v1/tickets/stream
 * Server-Sent Events endpoint for real-time admin dashboard updates.
 *
 * Reconnect: uses Last-Event-ID header (standard EventSource spec).
 * Polling: queries DB every 3 s for tickets updated since last check.
 * Keepalive: sends SSE comment every 15 s to prevent proxy timeout.
 *
 * Soft delete: ticket.deleted 이벤트는 deletedAt 필드를 폴링해 감지한다.
 * deletedAt > lastCheckedAt 인 행을 주기적으로 쿼리하여 클라이언트에 알린다.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === "error") {
    return unauthorized();
  }

  // Reconnect support: Last-Event-ID header carries Unix ms timestamp
  const lastEventIdHeader = req.headers.get("last-event-id");
  const lastEventIdMs = lastEventIdHeader ? Number(lastEventIdHeader) : NaN;
  let lastCheckedAt =
    !Number.isNaN(lastEventIdMs) && Number.isFinite(lastEventIdMs)
      ? new Date(lastEventIdMs)
      : new Date();

  // Track which ticket IDs were already seen to distinguish created vs updated
  const seenIds = new Set<string>();

  // Timers declared in outer scope so cancel() can clear them
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let keepaliveTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function enqueue(chunk: string) {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller closed — teardown will fire via cancel()
        }
      }

      // Send retry hint and init event immediately on connect
      enqueue(formatSSERetry(5000));
      try {
        const stats = await getTicketStats();
        const initPayload: SSEInitPayload = {
          total: stats.total,
          open: stats.byStatus.OPEN,
        };
        const now = Date.now();
        enqueue(formatSSEEvent(String(now), "init", initPayload));
      } catch (err) {
        console.error("[SSE] init stats failed", err);
      }

      // Poll DB for new/updated/deleted tickets every STREAM_POLL_INTERVAL_MS
      pollTimer = setInterval(async () => {
        try {
          const pollTime = new Date();

          // 업데이트된 활성 티켓 감지 (created / updated)
          const changed = await prisma.feedback.findMany({
            where: { updatedAt: { gt: lastCheckedAt }, deletedAt: null },
            select: TICKET_STREAM_SELECT,
            orderBy: { updatedAt: "asc" },
          });

          for (const row of changed) {
            const item: TicketStreamItem = {
              id: row.id,
              trackingId: row.trackingId,
              title: row.title,
              type: row.type,
              status: row.status,
              priority: row.priority,
              assigneeId: row.assigneeId,
              updatedAt: row.updatedAt.toISOString(),
            };

            const eventType = seenIds.has(row.id)
              ? "ticket.updated"
              : "ticket.created";
            seenIds.add(row.id);

            const eventId = String(row.updatedAt.getTime());
            enqueue(formatSSEEvent(eventId, eventType, item));
          }

          // 소프트 삭제된 티켓 감지 (deleted)
          const deleted = await prisma.feedback.findMany({
            where: {
              deletedAt: { not: null, gt: lastCheckedAt },
            },
            select: { id: true, deletedAt: true },
            orderBy: { deletedAt: "asc" },
          });

          for (const row of deleted) {
            const payload: TicketDeletedPayload = { id: row.id };
            const eventId = String(row.deletedAt!.getTime());
            enqueue(formatSSEEvent(eventId, "ticket.deleted", payload));
            seenIds.delete(row.id);
          }

          if (changed.length > 0 || deleted.length > 0) {
            lastCheckedAt = pollTime;
          }
        } catch (err) {
          console.error("[SSE] poll failed", err);
        }
      }, STREAM_POLL_INTERVAL_MS);

      // Keepalive comment to prevent proxy timeout on idle connections
      keepaliveTimer = setInterval(() => {
        enqueue(formatSSEComment("keepalive"));
      }, STREAM_KEEPALIVE_INTERVAL_MS);
    },

    /**
     * REQUIRED: clean up intervals when client disconnects.
     * Without this, intervals continue running after disconnect,
     * issuing wasted DB queries until the serverless function terminates.
     */
    cancel() {
      clearInterval(pollTimer);
      clearInterval(keepaliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
