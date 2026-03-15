import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { trackingIdSchema } from "@/lib/validators/feedback";
import { ok, badRequest, notFound, serverError } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ trackingId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { trackingId } = await params;

    const parsed = trackingIdSchema.safeParse({ trackingId });
    if (!parsed.success) {
      return badRequest("Invalid tracking ID format");
    }

    const feedback = await prisma.feedback.findUnique({
      where: { trackingId },
      select: {
        trackingId: true,
        type: true,
        status: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!feedback) {
      return notFound("Feedback");
    }

    return ok(feedback);
  } catch (err) {
    return serverError(err);
  }
}
