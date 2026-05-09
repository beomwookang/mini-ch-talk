import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const VALID_EVENTS = ['started', 'escalated', 'resolved'] as const;
type WorkflowEventType = (typeof VALID_EVENTS)[number];

interface EventBody {
  customer_id: string;
  event_type: WorkflowEventType;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<EventBody>;
  const customer_id = body.customer_id?.trim();
  const event_type = body.event_type;

  if (
    !customer_id ||
    !event_type ||
    !VALID_EVENTS.includes(event_type as WorkflowEventType)
  ) {
    return NextResponse.json(
      { error: 'customer_id and event_type (started|escalated|resolved) required' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('workflow_events').insert({
    customer_id,
    event_type,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
