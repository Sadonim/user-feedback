import { ok, serverError, tooManyRequests } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/require-auth";
import { getAnalyticsSummary } from "@/server/services/analytics";
import { checkAdminRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v1/analytics/summary
 * All-time aggregated analytics:
 *   statusFunnel, typeDist, priorityDist,
 *   openRate, resolutionRate, avgResolutionHours
 *
 * Auth: required (any authenticated admin)
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.type === "error") return authResult.response;

  const allowed = await checkAdminRateLimit(authResult.user.id);
  if (!allowed) return tooManyRequests();

  try {
    const data = await getAnalyticsSummary();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
