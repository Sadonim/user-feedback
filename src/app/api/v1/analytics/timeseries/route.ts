import { type NextRequest } from "next/server";
import { ok, badRequest, serverError, tooManyRequests } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/require-auth";
import { timeseriesQuerySchema } from "@/lib/validators/feedback";
import { getTimeseries } from "@/server/services/analytics";
import { checkAdminRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v1/analytics/timeseries
 * Daily ticket counts for the last N days (default 30).
 *
 * Query params:
 *   days  — 7 | 14 | 30 | 90  (default 30)
 *   type  — BUG | FEATURE | GENERAL  (optional filter)
 *
 * Auth: required (any authenticated admin)
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === "error") return authResult.response;

  const allowed = await checkAdminRateLimit(authResult.user.id);
  if (!allowed) return tooManyRequests();

  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = timeseriesQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return badRequest(message);
  }

  try {
    const data = await getTimeseries(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
