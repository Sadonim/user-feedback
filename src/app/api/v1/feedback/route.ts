import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { submitFeedbackSchema } from "@/lib/validators/feedback";
import { ok, created, badRequest, serverError, tooManyRequests } from "@/lib/api/response";
import { generateTrackingId } from "@/lib/tracking";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return tooManyRequests();
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return badRequest("Invalid JSON body");
    }

    const parsed = submitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return badRequest(message);
    }

    const { type, title, description, nickname, email } = parsed.data;

    // Retry loop for trackingId uniqueness (collision probability is negligible but handled correctly)
    let feedback = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        feedback = await prisma.feedback.create({
          data: {
            type,
            title,
            description,
            nickname,
            email: email || null,
            trackingId: generateTrackingId(),
            statusHistory: {
              create: { toStatus: "OPEN" },
            },
          },
          select: {
            id: true,
            trackingId: true,
            type: true,
            status: true,
            title: true,
            createdAt: true,
          },
        });
        break;
      } catch (err: unknown) {
        const isUniqueViolation =
          err instanceof Error && "code" in err && (err as { code: string }).code === "P2002";
        if (!isUniqueViolation) throw err;
        lastError = err;
      }
    }

    if (!feedback) {
      console.error("[Feedback] Failed after 3 trackingId attempts:", lastError);
      return serverError("Failed to generate unique tracking ID. Please try again.");
    }

    return created(feedback);
  } catch (err) {
    return serverError(err);
  }
}
