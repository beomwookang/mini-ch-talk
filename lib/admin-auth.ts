import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Manager } from '@/lib/types';

export const ADMIN_COOKIE = 'mctk_demo_admin';
export const DEMO_MANAGER_EMAIL = 'demo-manager@example.com';

export async function getAdminCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value ?? null;
}

export async function getCurrentManager(): Promise<Manager | null> {
  const cookieValue = await getAdminCookie();
  if (!cookieValue) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('managers')
    .select('*')
    .eq('email', cookieValue)
    .maybeSingle();
  if (error || !data) return null;
  return data as Manager;
}
