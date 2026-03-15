import { auth } from '@/auth';
import { unauthorized } from '@/lib/api/response';
import type { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import type { UserRole } from '@prisma/client';

export interface AuthOk {
  type: 'ok';
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole; // H3 fix: precise type for compile-time RBAC safety
  };
}

export interface AuthFail {
  type: 'error';
  response: NextResponse<ApiResponse<null>>;
}

export async function requireAuth(): Promise<AuthOk | AuthFail> {
  const session = await auth();
  if (!session?.user?.id) {
    return { type: 'error', response: unauthorized() };
  }
  return {
    type: 'ok',
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      username: session.user.username,
      role: session.user.role,
    },
  };
}
