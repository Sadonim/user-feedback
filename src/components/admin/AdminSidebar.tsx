'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Ticket, BarChart3, LogOut, MessageSquareDiff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';

interface AdminSidebarProps {
  user: { username: string; role: UserRole };
}

const navItems = [
  { href: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/tickets', label: '티켓', icon: Ticket },
  { href: '/admin/analytics', label: '분석', icon: BarChart3 },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    /* ADM-08: aside landmark labelled for landmark navigation */
    <aside aria-label="Sidebar" className="flex w-56 flex-col border-r bg-card">
      {/* Brand area */}
      <div className="flex items-center gap-2.5 border-b px-4 py-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <MessageSquareDiff aria-hidden="true" className="size-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Feedback</span>
      </div>

      {/* ADM-03: nav labelled so multiple nav landmarks are distinguishable */}
      <nav aria-label="Main navigation" className="flex-1 space-y-0.5 px-2 pt-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            /* ADM-02: aria-current="page" communicates active item beyond CSS */
            aria-current={pathname === href ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-100',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {/* ADM-04: icons are decorative — text already identifies the link */}
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User info + sign out */}
      <div className="border-t px-2 py-3 space-y-0.5">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{user.username}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{user.role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {/* ADM-04: decorative icon */}
          <LogOut aria-hidden="true" className="size-4 shrink-0" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
