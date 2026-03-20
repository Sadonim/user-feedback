import { type NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { ok, serverError, tooManyRequests } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/require-auth";
import { checkAdminRateLimit } from "@/lib/rate-limit";

// SECURITY: explicit select — never return passwordHash from AdminUser
const ADMIN_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
} as const;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/v1/admin/users?limit=50
 * List admin users for assignee dropdown (paginated).
 * Auth: any authenticated admin (any role).
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === "error") return authResult.response;

  const allowed = await checkAdminRateLimit(authResult.user.id);
  if (!allowed) return tooManyRequests();

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    Math.max(1, Number(limitParam) || DEFAULT_LIMIT),
    MAX_LIMIT
  );

  try {
    const users = await prisma.adminUser.findMany({
      select: ADMIN_USER_SELECT,
      orderBy: { username: "asc" },
      take: limit,
    });

    return ok(users, { total: users.length, page: 1, limit, hasNextPage: false });
  } catch (err) {
    return serverError(err);
  }
}
