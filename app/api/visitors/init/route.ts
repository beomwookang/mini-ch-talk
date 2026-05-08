import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateAnonId } from '@/lib/anon-id';
import type { Conversation, Customer } from '@/lib/types';

const COOKIE_NAME = 'mctk_anon';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const VISIT_TIMEOUT_MS = 30 * 60 * 1000;

interface InitRequestBody {
  anonymous_id?: string | null;
  url?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as InitRequestBody;
  const providedId = body.anonymous_id ?? null;

  const supabase = await createSupabaseServerClient();

  let customer: Customer | null = null;
  let conversations: Conversation[] = [];

  if (providedId) {
    const { data: existing, error: lookupErr } = await supabase
      .from('customers')
      .select('*')
      .eq('anonymous_id', providedId)
      .maybeSingle();
    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    }

    if (existing) {
      // visit_count uses 30-min inactivity timeout (Intercom/GA4 industry standard)
      // — see DOCS/DECISION.md §7.2. Latest customer_sessions row drives the gate.
      const { data: latestSession, error: sessLookupErr } = await supabase
        .from('customer_sessions')
        .select('started_at')
        .eq('customer_id', existing.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sessLookupErr) {
        return NextResponse.json({ error: sessLookupErr.message }, { status: 500 });
      }

      const isNewVisit =
        !latestSession ||
        Date.now() - new Date(latestSession.started_at).getTime() > VISIT_TIMEOUT_MS;

      if (isNewVisit) {
        const { data: updated, error: updateErr } = await supabase
          .from('customers')
          .update({ visit_count: (existing.visit_count ?? 0) + 1 })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }
        customer = updated as Customer;
      } else {
        customer = existing as Customer;
      }

      // Latest 1 conversation regardless of status — closed thread is still
      // resumable (customer reply auto-reopens; see /api/messages reopen logic).
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', existing.id)
        .order('opened_at', { ascending: false })
        .limit(1);
      if (convErr) {
        return NextResponse.json({ error: convErr.message }, { status: 500 });
      }
      conversations = (convs ?? []) as Conversation[];
    }
  }

  if (!customer) {
    const newAnonId = providedId ?? generateAnonId();
    const { data: created, error: createErr } = await supabase
      .from('customers')
      .insert({ anonymous_id: newAnonId })
      .select('*')
      .single();
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
    customer = created as Customer;
  }

  const { error: sessionErr } = await supabase.from('customer_sessions').insert({
    customer_id: customer.id,
    url: body.url ?? null,
    referrer: body.referrer ?? null,
    user_agent: body.user_agent ?? null,
  });
  if (sessionErr) {
    return NextResponse.json({ error: sessionErr.message }, { status: 500 });
  }

  const res = NextResponse.json({ customer, conversations });
  res.cookies.set({
    name: COOKIE_NAME,
    value: customer.anonymous_id,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });
  return res;
}
