import { getCurrentManager } from '@/lib/admin-auth';
import { startAdminSession } from './_actions';
import { AdminConsole } from './_components/AdminConsole';
import { AdminCta } from './_components/AdminCta';

interface Props {
  searchParams: Promise<{ as?: string }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const manager = await getCurrentManager();

  if (!manager) {
    if (params.as === 'demo-manager') {
      // server action sets cookie + redirects to /admin
      await startAdminSession();
    }
    return <AdminCta />;
  }

  return <AdminConsole managerId={manager.id} managerName={manager.name} />;
}
