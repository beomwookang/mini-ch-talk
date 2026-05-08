import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Conversation, ConversationStatus } from '@/lib/types';

const VALID_STATUSES: ConversationStatus[] = ['pending', 'active', 'closed'];

interface StatusBody {
  status: ConversationStatus;
  assignee_id?: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = (await req.json().catch(() => ({}))) as Partial<StatusBody>;
  const status = payload.status;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const update: Record<string, unknown> = { status };
  if (status === 'closed') {
    update.closed_at = new Date().toISOString();
  }
  if (status === 'active' && payload.assignee_id) {
    update.assignee_id = payload.assignee_id;
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversation: data as Conversation });
}
