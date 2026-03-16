import { type NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { ticketFiltersSchema } from '@/lib/validators/feedback';
import { ok, badRequest, serverError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/require-auth';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.type === 'error') return authResult.response;

  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ticketFiltersSchema.safeParse(searchParams);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(', ');
    return badRequest(message);
  }

  const { page, limit, status, type, priority, sort, order } = parsed.data;

  const where = {
    ...(status && { status }),
    ...(type && { type }),
    ...(priority && { priority }),
  };

  // [H4] 동적 sort 필드에 명시적 맵핑을 적용한다.
  // Zod가 이미 enum 검증을 하지만, Prisma orderBy에 전달하기 전
  // 허용된 컬럼만 선택하여 TypeScript 타입 안전성을 보장한다.
  const SORT_FIELDS = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  } as const satisfies Record<typeof sort, string>;

  try {
    const [total, items] = await prisma.$transaction([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        orderBy: { [SORT_FIELDS[sort]]: order },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          trackingId: true,
          type: true,
          status: true,
          title: true,
          nickname: true,
          priority: true,
          assigneeId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return ok(items, {
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    });
  } catch (err) {
    return serverError(err);
  }
}
