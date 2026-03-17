import { type NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { updateTicketSchema } from '@/lib/validators/feedback';
import { ok, badRequest, notFound, serverError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';
import { emailService } from '@/server/services/email';

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
  createdAt: true,
  updatedAt: true,
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
    },
  },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const { id } = await params;
  if (!id) return badRequest('Invalid ticket ID');

  try {
    const ticket = await prisma.feedback.findUnique({
      where: { id },
      select: TICKET_DETAIL_SELECT,
    });
    if (!ticket) return notFound('Ticket');
    return ok(ticket);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const { id } = await params;
  if (!id) return badRequest('Invalid ticket ID');

  const body = await req.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body');

  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(', ');
    return badRequest(message);
  }

  const { status, priority, note } = parsed.data;

  const updateData = {
    ...(status !== undefined && { status }),
    ...(priority !== undefined && { priority }),
  };

  // Variables captured inside transaction for post-commit email use (C2 fix)
  let capturedEmail: string | null = null;
  let capturedTitle = '';
  let capturedTrackingId = '';
  let capturedFromStatus: import('@prisma/client').TicketStatus | null = null;
  let capturedToStatus: import('@prisma/client').TicketStatus | null = null;
  let didStatusChange = false;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.feedback.findUnique({
        where: { id },
        select: { status: true, email: true, title: true, trackingId: true },
      });
      if (!existing) throw new Error('NOT_FOUND');

      const prevStatus = existing.status;
      await tx.feedback.update({ where: { id }, data: updateData });

      const statusChanged = status !== undefined && status !== prevStatus;
      const noteOnly = !statusChanged && note !== undefined;

      if (statusChanged || noteOnly) {
        await tx.statusHistory.create({
          data: {
            feedbackId: id,
            fromStatus: prevStatus,
            toStatus: statusChanged ? status! : prevStatus,
            changedById: authResult.user.id,
            note: note ?? null,
          },
        });
      }

      // Capture for post-commit use (C2 fix: inside transaction, no race window)
      capturedEmail = existing.email;
      capturedTitle = existing.title;
      capturedTrackingId = existing.trackingId;
      capturedFromStatus = prevStatus;
      capturedToStatus = statusChanged ? status! : null;
      didStatusChange = statusChanged;
    });

    const updated = await prisma.feedback.findUnique({
      where: { id },
      select: TICKET_DETAIL_SELECT,
    });
    if (!updated) return notFound('Ticket');

    // Send email notification AFTER response data is ready, BEFORE returning (C1 fix: await not void)
    if (didStatusChange && capturedEmail && capturedToStatus) {
      try {
        await emailService.notifyStatusChanged({
          to: capturedEmail,
          trackingId: capturedTrackingId,
          fromStatus: capturedFromStatus,
          toStatus: capturedToStatus,
          title: capturedTitle,
          note: note ?? null,
        });
      } catch (e) {
        console.error('[Email] notifyStatusChanged failed', e);
      }
    }

    return ok(updated);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return notFound('Ticket');
    }
    return serverError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const { id } = await params;
  if (!id) return badRequest('Invalid ticket ID');

  try {
    const existing = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return notFound('Ticket');

    await prisma.feedback.delete({ where: { id } });

    return ok({ id, deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
