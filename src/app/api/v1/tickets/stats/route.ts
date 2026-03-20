import { type NextRequest } from 'next/server';
import { ok, serverError, tooManyRequests } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';
import { getTicketStats } from '@/server/services/ticket-stats';
import { checkAdminRateLimit } from '@/lib/rate-limit';

export async function GET(_req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const allowed = await checkAdminRateLimit(authResult.user.id);
  if (!allowed) return tooManyRequests();

  try {
    const stats = await getTicketStats();
    return ok(stats);
  } catch (err) {
    return serverError(err);
  }
}
