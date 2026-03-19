import { type NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { assignTicketSchema } from "@/lib/validators/feedback";
import { ok, badRequest, notFound, serverError, tooManyRequests } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/require-auth";
import { checkAdminRateLimit } from "@/lib/rate-limit";

const TICKET_DETAIL_SELECT = {
  id: true,
  trackingId: true,
  type: true,
  status: true,
  title: true,
  description: true,
  nickname: true,
  email: true,
  priority: true,
  assigneeId: true,
  assignee: {
    select: { id: true, username: true, email: true, role: true },
  },
  createdAt: true,
  updatedAt: true,
  statusHistory: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
    },
  },
} as const;

/**
 * POST /api/v1/tickets/:id/assign
 * Assign or unassign a ticket to an admin user.
 * Body: { assigneeId: string | null }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.type === "error") return authResult.response;

  const allowed = await checkAdminRateLimit(authResult.user.id);
  if (!allowed) return tooManyRequests();

  const { id } = await params;
  if (!id) return badRequest("Invalid ticket ID");

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const parsed = assignTicketSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return badRequest(message);
  }

  const { assigneeId } = parsed.data;

  try {
    // Verify ticket exists
    const existing = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return notFound("Ticket");

    // Verify assignee exists when assigning (not when unassigning)
    if (assigneeId !== null) {
      const assignee = await prisma.adminUser.findUnique({
        where: { id: assigneeId },
        select: { id: true },
      });
      if (!assignee) return notFound("Assignee");
    }

    await prisma.feedback.update({
      where: { id },
      data: { assigneeId },
    });

    const updated = await prisma.feedback.findUnique({
      where: { id },
      select: TICKET_DETAIL_SELECT,
    });
    if (!updated) return notFound("Ticket");

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}
