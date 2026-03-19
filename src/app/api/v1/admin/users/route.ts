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

/**
 * GET /api/v1/admin/users
 * List all admin users for assignee dropdown.
 * Auth: any authenticated admin (any role).
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === "error") return authResult.response;

  const allowed = await checkAdminRateLimit(authResult.user.id);
  if (!allowed) return tooManyRequests();

  try {
    const users = await prisma.adminUser.findMany({
      select: ADMIN_USER_SELECT,
      orderBy: { username: "asc" },
    });

    return ok(users);
  } catch (err) {
    return serverError(err);
  }
}
