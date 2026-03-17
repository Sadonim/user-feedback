'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { LoginErrorAlert } from './LoginErrorAlert';

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /* LGN-02: refs to move focus to error alert on failed login */
  const errorRef = useRef<HTMLDivElement>(null);
  /** Guards against re-focusing on every re-render while the same error persists */
  const hasFocusedRef = useRef(false);

  /* LGN-02: focus the error alert after React commits the render.
     Watching `error` directly avoids the react-hooks/set-state-in-effect violation
     that came from calling setShouldFocusError(false) inside the effect body. */
  useEffect(() => {
    if (error && !hasFocusedRef.current && errorRef.current) {
      errorRef.current.focus();
      hasFocusedRef.current = true;
    }
    if (!error) {
      hasFocusedRef.current = false;
    }
  }, [error]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    startTransition(async () => {
      setError(null);
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        /* LGN-02: setting error triggers the useEffect which moves focus */
        setError('Invalid email or password');
        return;
      }

      // C1 fix: client-side defence-in-depth — never redirect to absolute URLs
      const safeCallback =
        callbackUrl &&
        callbackUrl.startsWith('/') &&
        !callbackUrl.startsWith('//')
          ? callbackUrl
          : '/admin/dashboard';

      router.push(safeCallback);
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        {/* LGN-01: h1 so the login page has a heading landmark */}
        <h1 data-slot="card-title" className="text-base leading-snug font-medium">
          Admin Login
        </h1>
        <CardDescription>user-feedback management</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            /* LGN-02: tabIndex={-1} on the alert itself makes it focusable */
            <LoginErrorAlert
              ref={errorRef}
              message={error}
              tabIndex={-1}
              className="outline-none"
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Forgot password? Contact the system administrator.
        </p>
      </CardContent>
    </Card>
  );
}
