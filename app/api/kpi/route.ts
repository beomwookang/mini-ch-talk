import { NextResponse } from 'next/server';
import { computeKpi } from '@/lib/kpi';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await computeKpi();
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'kpi error' },
      { status: 500 },
    );
  }
}
