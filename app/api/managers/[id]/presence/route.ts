import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ManagerOnlineStatus } from '@/lib/types';

const VALID: ManagerOnlineStatus[] = ['online', 'offline', 'away'];

interface PresenceBody {
  status: ManagerOnlineStatus;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<PresenceBody>;
  const status = body.status;

  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('managers')
    .update({
      online_status: status,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
