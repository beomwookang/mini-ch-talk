import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { SenderType } from '@/lib/types';

interface ReadBody {
  conversation_id: string;
  reader: SenderType; // 'manager' marks customer-sent messages read; 'customer' marks manager-sent.
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<ReadBody>;
  const conversation_id = body.conversation_id;
  const reader = body.reader;

  if (!conversation_id || (reader !== 'manager' && reader !== 'customer')) {
    return NextResponse.json(
      { error: 'conversation_id and reader (manager|customer) required' },
      { status: 400 },
    );
  }

  const senderToMark: SenderType = reader === 'manager' ? 'customer' : 'manager';

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() }, { count: 'exact' })
    .eq('conversation_id', conversation_id)
    .eq('sender_type', senderToMark)
    .is('read_at', null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ marked: count ?? 0 });
}
