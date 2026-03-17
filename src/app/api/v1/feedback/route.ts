import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { submitFeedbackSchema } from "@/lib/validators/feedback";
import { created, badRequest, serverError, tooManyRequests } from "@/lib/api/response";
import { generateTrackingId } from "@/lib/tracking";
import { checkRateLimit } from "@/lib/rate-limit";
import { withPublicCors, publicCorsPreflightResponse } from "@/lib/api/cors";
import { emailService, parseAdminEmails } from "@/server/services/email";

export async function OPTIONS(req: NextRequest) {
  return publicCorsPreflightResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    // Use last entry of X-Forwarded-For (platform-appended, not client-controlled on Vercel)
    // Cap key length to prevent Redis key size abuse (H1 security fix)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded?.split(",").at(-1)?.trim() ?? "anonymous").slice(0, 45);
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return withPublicCors(tooManyRequests(), origin);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return withPublicCors(badRequest("Invalid JSON body"), origin);
    }

    const parsed = submitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return withPublicCors(badRequest(message), origin);
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
      return withPublicCors(serverError("Failed to generate unique tracking ID. Please try again."), origin);
    }

    // Admin notification — await with catch so email failure never breaks the API response (C1 fix)
    try {
      await emailService.notifyAdminNewFeedback({
        adminEmails: parseAdminEmails(process.env.ADMIN_NOTIFICATION_EMAILS),
        trackingId: feedback.trackingId,
        type: feedback.type,
        title: feedback.title,
        nickname: parsed.data.nickname ?? null,
      });
    } catch (e) {
      console.error('[Email] notifyAdminNewFeedback failed', e);
    }

    return withPublicCors(created(feedback), origin);
  } catch (err) {
    return withPublicCors(serverError(err), origin);
  }
}
