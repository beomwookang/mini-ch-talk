'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Conversation, Customer, CustomerSession } from '@/lib/types';

interface Props {
  conversation: Conversation | null;
}

export function ProfilePanel({ conversation }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lastSession, setLastSession] = useState<CustomerSession | null>(null);
  const [pastConversations, setPastConversations] = useState<Conversation[]>([]);
  const supabaseRef = useRef(createSupabaseBrowserClient());

  useEffect(() => {
    if (!conversation) return;
    const sb = supabaseRef.current;
    const { id: convId, customer_id } = conversation;
    let cancelled = false;

    (async () => {
      const [custRes, sessRes, convsRes] = await Promise.all([
        sb.from('customers').select('*').eq('id', customer_id).single(),
        sb
          .from('customer_sessions')
          .select('*')
          .eq('customer_id', customer_id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from('conversations')
          .select('*')
          .eq('customer_id', customer_id)
          .neq('id', convId)
          .order('opened_at', { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;
      if (custRes.error) console.error('customer fetch', custRes.error);
      else if (custRes.data) setCustomer(custRes.data as Customer);
      if (sessRes.error) console.error('session fetch', sessRes.error);
      else setLastSession((sessRes.data as CustomerSession) ?? null);
      if (convsRes.error) console.error('past conv fetch', convsRes.error);
      else setPastConversations((convsRes.data ?? []) as Conversation[]);
    })();

    const channel = sb
      .channel(`admin:customer:${customer_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${customer_id}`,
        },
        (payload) => {
          setCustomer(payload.new as Customer);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [conversation]);

  if (!conversation) {
    return (
      <div className="p-4 text-xs text-gray-400">
        대화를 선택하면 정보가 표시됩니다
      </div>
    );
  }
  if (!customer) {
    return <div className="p-4 text-xs text-gray-400">로딩 중…</div>;
  }

  return (
    <div className="space-y-5 overflow-y-auto p-4 text-sm">
      <section>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          고객
        </h3>
        <div className="space-y-1">
          <div className="font-medium text-gray-900">
            {customer.name ?? '익명'}
          </div>
          {customer.email && (
            <div className="text-xs text-gray-600">{customer.email}</div>
          )}
          <div className="font-mono text-[10px] text-gray-400">
            {customer.anonymous_id}
          </div>
          {customer.identified_at && (
            <div className="text-[10px] text-gray-500">
              식별 {new Date(customer.identified_at).toLocaleString('ko-KR')}
            </div>
          )}
          <div className="text-[10px] text-gray-500">
            방문 {customer.visit_count}회
          </div>
        </div>
      </section>

      {lastSession && (
        <section>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            마지막 세션
          </h3>
          <div className="space-y-0.5 text-xs">
            <div className="truncate text-gray-700">{lastSession.url ?? '—'}</div>
            <div className="truncate text-[10px] text-gray-500">
              referrer: {lastSession.referrer ?? '—'}
            </div>
            <div className="text-[10px] text-gray-400">
              {new Date(lastSession.started_at).toLocaleString('ko-KR')}
            </div>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          과거 대화 ({pastConversations.length})
        </h3>
        {pastConversations.length === 0 ? (
          <div className="text-xs text-gray-400">없음</div>
        ) : (
          <ul className="space-y-1">
            {pastConversations.map((c) => (
              <li
                key={c.id}
                className="rounded border border-gray-100 bg-gray-50 p-2"
              >
                <div className="font-mono text-[10px] text-gray-500">
                  {c.id.slice(0, 8)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-600">
                  <span className="rounded bg-white px-1.5 py-0.5 uppercase text-gray-600">
                    {c.status}
                  </span>
                  <span className="text-gray-400">
                    {new Date(c.opened_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
