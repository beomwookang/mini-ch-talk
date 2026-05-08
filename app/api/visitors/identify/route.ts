import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Customer } from '@/lib/types';

interface IdentifyBody {
  customer_id: string;
  name: string;
  email: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<IdentifyBody>;
  const customer_id = body.customer_id?.trim();
  const name = body.name?.trim();
  const email = body.email?.trim();

  if (!customer_id || !name || !email) {
    return NextResponse.json(
      { error: 'customer_id, name, email required' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  // Spec §5.5: multi-device merge X — same email on a different customer
  // stays as a separate row. No reconciliation logic.
  const { data, error } = await supabase
    .from('customers')
    .update({ name, email, identified_at: new Date().toISOString() })
    .eq('id', customer_id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data as Customer });
}
