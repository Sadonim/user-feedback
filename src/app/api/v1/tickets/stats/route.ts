import { ok, serverError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';
import { getTicketStats } from '@/server/services/ticket-stats';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  try {
    const stats = await getTicketStats();
    return ok(stats);
  } catch (err) {
    return serverError(err);
  }
}
