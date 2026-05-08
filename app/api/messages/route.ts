import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Conversation, Message, SenderType } from '@/lib/types';

interface SendMessageBody {
  conversation_id?: string | null;
  customer_id?: string | null;
  sender_type: SenderType;
  sender_id?: string | null;
  body: string;
  is_internal?: boolean;
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => ({}))) as SendMessageBody;
  const { sender_type, sender_id, body, is_internal } = payload;

  if (!sender_type || !body || !body.trim()) {
    return NextResponse.json(
      { error: 'sender_type and non-empty body required' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  let conversationId = payload.conversation_id ?? null;

  if (!conversationId) {
    if (sender_type !== 'customer' || !payload.customer_id) {
      return NextResponse.json(
        { error: 'customer_id required to create a new conversation' },
        { status: 400 },
      );
    }
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ customer_id: payload.customer_id, status: 'pending' })
      .select('*')
      .single();
    if (convErr) {
      return NextResponse.json({ error: convErr.message }, { status: 500 });
    }
    conversationId = (conv as Conversation).id;
  }

  // Sequence assignment per Spec §6.3 — two-statement read+insert. Race rare in
  // demo load; SERIALIZABLE/advisory-lock left as offline trade-off (Spec §6.3).
  const { data: maxRow, error: maxErr } = await supabase
    .from('messages')
    .select('sequence')
    .eq('conversation_id', conversationId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) {
    return NextResponse.json({ error: maxErr.message }, { status: 500 });
  }
  const nextSequence = (maxRow?.sequence ?? 0) + 1;

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type,
      sender_id: sender_id ?? null,
      body: body.trim(),
      is_internal: is_internal ?? false,
      sequence: nextSequence,
    })
    .select('*')
    .single();
  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({
    message: msg as Message,
    conversation_id: conversationId,
  });
}
