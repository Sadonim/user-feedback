import type { UserRole } from '@prisma/client';

interface AdminHeaderProps {
  user: { username: string; email: string | null | undefined; role: UserRole };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-muted-foreground">{user.email ?? ''}</p>
        </div>
        {/* ADM-07: avatar initial is decorative — username/email already provides context */}
        <div
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground uppercase"
        >
          {user.username.slice(0, 1)}
        </div>
      </div>
    </header>
  );
}
