import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Admin Login',
};

// C1 fix: validate callbackUrl server-side — only relative paths allowed.
// Prevents open redirect: https://evil.com or //evil.com → /admin/dashboard
// (?!\/) — 두 번째 문자가 / 이면 거부 (프로토콜 상대 URL //evil.com 차단)
const SAFE_CALLBACK_RE = /^\/(?!\/)[a-zA-Z0-9\-_/?=&%#]*$/;

export function sanitizeCallbackUrl(raw: string | undefined): string {
  if (raw && SAFE_CALLBACK_RE.test(raw)) return raw;
  return '/admin/dashboard';
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
