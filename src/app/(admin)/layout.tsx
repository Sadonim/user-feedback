import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface Props {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar user={session.user} />
      <div className="flex flex-1 flex-col">
        <AdminHeader user={{ ...session.user, email: session.user.email ?? null }} />
        <main id="main-content" className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
