import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { sanitizeCallbackUrl as _sanitize } from '@/lib/auth/sanitize-callback-url';

export const metadata: Metadata = {
  title: 'Admin Login',
};

/**
 * [H1] named re-export — 기존 테스트가 이 모듈에서 import하므로 유지.
 * 실제 구현은 src/lib/auth/sanitize-callback-url.ts 에 있다.
 */
export function sanitizeCallbackUrl(raw: string | undefined): string {
  return _sanitize(raw);
}

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LoginForm callbackUrl={safeCallbackUrl} />
    </main>
  );
}
