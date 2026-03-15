import { ok, serverError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';
import { getTicketStats } from '@/server/services/ticket-stats';

export async function GET() {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  try {
    const stats = await getTicketStats();
    return ok(stats);
  } catch (err) {
    return serverError(err);
  }
}
