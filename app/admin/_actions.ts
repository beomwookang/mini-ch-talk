'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, DEMO_MANAGER_EMAIL } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7d

export async function startAdminSession() {
  const supabase = await createSupabaseServerClient();
  const { data: manager, error } = await supabase
    .from('managers')
    .select('id, email')
    .eq('email', DEMO_MANAGER_EMAIL)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!manager) throw new Error('demo manager not seeded');

  const store = await cookies();
  store.set({
    name: ADMIN_COOKIE,
    value: DEMO_MANAGER_EMAIL,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });
  redirect('/admin');
}

export async function endAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect('/admin');
}
