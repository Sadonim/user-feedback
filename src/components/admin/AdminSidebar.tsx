'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Ticket, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';

interface AdminSidebarProps {
  user: { username: string; role: UserRole };
}

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tickets', label: 'Tickets', icon: Ticket },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r bg-card py-4">
      <div className="px-4 pb-4 border-b">
        <p className="text-sm font-semibold truncate">{user.username}</p>
        <p className="text-xs text-muted-foreground">{user.role}</p>
      </div>

      <nav className="flex-1 space-y-1 px-2 pt-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-2">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
