import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface KpiSnapshot {
  recognition_rate: number | null; // visit_count > 1 비율 (전체 customers 대비)
  profile_filled_rate: number | null; // identified_at not null 비율
  ttfr_seconds: number | null; // 첫 customer→manager 응답 시간 median (초)
  active_conversations: number; // status='active' 카운트
  reopen_rate: number | null; // 종료 대화 중 reopened_count > 0 비율
  deflection_rate: number | null; // workflow 시작한 customer 중 escalate 안 한 비율
}

export async function computeKpi(): Promise<KpiSnapshot> {
  const supabase = await createSupabaseServerClient();

  const [
    customerStatsRes,
    activeRes,
    closedConvsRes,
    ttfrRes,
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('id, visit_count, identified_at'),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('conversations')
      .select('id, status, closed_at, reopened_count'),
    supabase
      .from('conversations')
      .select('id'),
  ]);

  // §8.1 + §8.2 customer 통계
  let recognition_rate: number | null = null;
  let profile_filled_rate: number | null = null;
  if (!customerStatsRes.error && customerStatsRes.data) {
    const total = customerStatsRes.data.length;
    if (total > 0) {
      const repeat = customerStatsRes.data.filter(
        (c) => (c.visit_count ?? 0) > 1,
      ).length;
      const identified = customerStatsRes.data.filter(
        (c) => c.identified_at,
      ).length;
      recognition_rate = repeat / total;
      profile_filled_rate = identified / total;
    }
  }

  // §8.4 active count
  const active_conversations = activeRes.count ?? 0;

  // §8.5 reopen_rate (종료 대화 모집단)
  let reopen_rate: number | null = null;
  if (!closedConvsRes.error && closedConvsRes.data) {
    const closed = closedConvsRes.data.filter(
      (c) => c.status === 'closed' || c.closed_at,
    );
    if (closed.length > 0) {
      const reopened = closed.filter(
        (c) => (c.reopened_count ?? 0) > 0,
      ).length;
      reopen_rate = reopened / closed.length;
    }
  }

  // §8.3 TTFR median — Supabase JS는 PERCENTILE_CONT 직접 표현 어려워 행을 가져와 계산
  let ttfr_seconds: number | null = null;
  if (!ttfrRes.error && ttfrRes.data && ttfrRes.data.length > 0) {
    const convIds = ttfrRes.data.map((c) => c.id as string);
    const [firstCustomerRes, firstManagerRes] = await Promise.all([
      supabase
        .from('messages')
        .select('conversation_id, created_at')
        .in('conversation_id', convIds)
        .eq('sender_type', 'customer')
        .order('created_at', { ascending: true }),
      supabase
        .from('messages')
        .select('conversation_id, created_at, is_internal')
        .in('conversation_id', convIds)
        .eq('sender_type', 'manager')
        .eq('is_internal', false)
        .order('created_at', { ascending: true }),
    ]);

    if (firstCustomerRes.data && firstManagerRes.data) {
      const firstCustomer = new Map<string, string>();
      for (const m of firstCustomerRes.data) {
        if (!firstCustomer.has(m.conversation_id)) {
          firstCustomer.set(m.conversation_id, m.created_at);
        }
      }
      const firstManager = new Map<string, string>();
      for (const m of firstManagerRes.data) {
        if (!firstManager.has(m.conversation_id)) {
          firstManager.set(m.conversation_id, m.created_at);
        }
      }

      const deltas: number[] = [];
      for (const [convId, customerTs] of firstCustomer) {
        const managerTs = firstManager.get(convId);
        if (!managerTs) continue;
        const delta =
          (new Date(managerTs).getTime() - new Date(customerTs).getTime()) /
          1000;
        if (delta >= 0) deltas.push(delta);
      }
      if (deltas.length > 0) {
        deltas.sort((a, b) => a - b);
        const mid = Math.floor(deltas.length / 2);
        ttfr_seconds =
          deltas.length % 2 === 0
            ? (deltas[mid - 1] + deltas[mid]) / 2
            : deltas[mid];
      }
    }
  }

  // deflection_rate — 각 명시적 결정(resolved 또는 escalated)을 별개 이벤트로 카운트.
  //   같은 customer가 워크플로우를 여러 번 시도해도 각 시도가 별도로 측정됨.
  //   unsettled (started 후 결정 안 한) 시도는 모집단에서 자연 제외.
  let deflection_rate: number | null = null;
  const { data: workflowEvents, error: wfErr } = await supabase
    .from('workflow_events')
    .select('event_type');
  if (wfErr) {
    console.error('kpi workflow_events fetch', wfErr);
  } else if (workflowEvents) {
    let resolvedCount = 0;
    let escalatedCount = 0;
    for (const e of workflowEvents) {
      if (e.event_type === 'resolved') resolvedCount++;
      else if (e.event_type === 'escalated') escalatedCount++;
    }
    const settledTotal = resolvedCount + escalatedCount;
    if (settledTotal > 0) {
      deflection_rate = resolvedCount / settledTotal;
    }
  }

  return {
    recognition_rate,
    profile_filled_rate,
    ttfr_seconds,
    active_conversations,
    reopen_rate,
    deflection_rate,
  };
}
