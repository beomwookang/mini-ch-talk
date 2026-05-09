'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { customerLabel } from '@/lib/customer-label';
import { messageTime } from '@/lib/relative-time';
import type {
  Conversation,
  ConversationStatus,
  Customer,
  LocalMessage,
  Message,
} from '@/lib/types';
import { endAdminSession } from '../_actions';
import { ConversationListItem } from './ConversationListItem';
import { KpiCards } from './KpiCards';
import { ProfilePanel } from './ProfilePanel';

const HEARTBEAT_MS = 30_000;

const STATUS_LABEL: Record<ConversationStatus, string> = {
  pending: '대기',
  active: '응대중',
  closed: '종료',
};
const STATUS_ORDER: ConversationStatus[] = ['pending', 'active', 'closed'];

interface AdminConsoleProps {
  managerId: string;
  managerName: string;
}

export function AdminConsole({ managerId, managerName }: AdminConsoleProps) {
  const DEMO_MANAGER_ID = managerId;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [internalMode, setInternalMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setStatus = (status: 'online' | 'offline') =>
      fetch(`/api/managers/${DEMO_MANAGER_ID}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        keepalive: true,
      }).catch(() => undefined);

    const beaconOffline = () => {
      const blob = new Blob([JSON.stringify({ status: 'offline' })], {
        type: 'application/json',
      });
      navigator.sendBeacon(
        `/api/managers/${DEMO_MANAGER_ID}/presence`,
        blob,
      );
    };

    setStatus('online');
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') setStatus('online');
    }, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') setStatus('offline');
      else setStatus('online');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', beaconOffline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', beaconOffline);
      beaconOffline();
    };
  }, [DEMO_MANAGER_ID]);

  useEffect(() => {
    const sb = supabaseRef.current;
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from('conversations')
        .select('*')
        .order('opened_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('conversations fetch', error);
        return;
      }
      if (data) setConversations(data as Conversation[]);
    })();

    const channel = sb
      .channel('admin:conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const conv = payload.new as Conversation;
            setConversations((prev) =>
              prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev],
            );
          } else if (payload.eventType === 'UPDATE') {
            const conv = payload.new as Conversation;
            setConversations((prev) =>
              prev.map((c) => (c.id === conv.id ? conv : c)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const sb = supabaseRef.current;
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedId)
        .order('sequence', { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error('admin messages fetch', error);
        return;
      }
      if (data) setMessages(data as LocalMessage[]);
    })();

    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: selectedId,
        reader: 'manager',
      }),
    }).catch(() => undefined);

    const channel = sb
      .channel(`admin:messages:${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, m as LocalMessage];
          });
          // Mark incoming customer messages as read while pane is open.
          if (m.sender_type === 'customer') {
            fetch('/api/messages/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversation_id: selectedId,
                reader: 'manager',
              }),
            }).catch(() => undefined);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.map((p) => (p.id === m.id ? { ...p, ...m } : p)),
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const tempId = `tmp_${crypto.randomUUID()}`;
    const isInternal = internalMode;
    const optimistic: LocalMessage = {
      id: tempId,
      tempId,
      localStatus: 'sending',
      conversation_id: selectedId,
      sender_type: 'manager',
      sender_id: DEMO_MANAGER_ID,
      body: text,
      is_internal: isInternal,
      sequence: -1,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedId,
          sender_type: 'manager',
          sender_id: DEMO_MANAGER_ID,
          body: text,
          is_internal: isInternal,
        }),
      });
      if (!res.ok) {
        console.error('admin send failed', await res.text());
        setMessages((prev) =>
          prev.map((p) =>
            p.tempId === tempId ? { ...p, localStatus: 'failed' } : p,
          ),
        );
        return;
      }
      const data = (await res.json()) as { message: Message };
      setMessages((prev) => {
        const withoutTemp = prev.filter((p) => p.tempId !== tempId);
        if (withoutTemp.some((p) => p.id === data.message.id)) return withoutTemp;
        return [
          ...withoutTemp,
          { ...(data.message as LocalMessage), localStatus: 'sent' },
        ];
      });
    } catch (err) {
      console.error('admin send error', err);
      setMessages((prev) =>
        prev.map((p) =>
          p.tempId === tempId ? { ...p, localStatus: 'failed' } : p,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const conv = conversations.find((c) => c.id === selectedId);
    if (!conv) return;
    const sb = supabaseRef.current;
    let cancelled = false;
    const customerId = conv.customer_id;

    (async () => {
      const { data, error } = await sb
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('admin selected customer fetch', error);
        return;
      }
      if (data) setSelectedCustomer(data as Customer);
    })();

    const channel = sb
      .channel(`admin-console:customer:${conv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${customerId}`,
        },
        (payload) => setSelectedCustomer(payload.new as Customer),
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [selectedId, conversations]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const grouped = useMemo(() => {
    const buckets: Record<ConversationStatus, Conversation[]> = {
      pending: [],
      active: [],
      closed: [],
    };
    for (const c of conversations) buckets[c.status].push(c);
    return buckets;
  }, [conversations]);

  async function changeStatus(next: ConversationStatus) {
    if (!selectedConversation) return;
    const res = await fetch(
      `/api/conversations/${selectedConversation.id}/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: next,
          assignee_id: next === 'active' ? DEMO_MANAGER_ID : undefined,
        }),
      },
    );
    if (!res.ok) console.error('status change failed', await res.text());
  }

  const isClosed = selectedConversation?.status === 'closed';

  const renderSenderLabel = (m: LocalMessage): string => {
    if (m.is_internal) return `${managerName} · 내부 메모`;
    if (m.sender_type === 'manager') return managerName;
    if (m.sender_type === 'customer') {
      return customerLabel(selectedCustomer, selectedConversation?.id ?? '');
    }
    return '시스템';
  };

  return (
    <main className="grid h-screen grid-rows-[auto_1fr] bg-gray-50 text-gray-900">
      <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex-1">
          <KpiCards />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
          <span className="text-gray-500">
            <span className="font-semibold text-gray-900">{managerName}</span>
            <span className="text-gray-400"> · 데모</span>
          </span>
          <form action={endAdminSession}>
            <button
              type="submit"
              className="text-[11px] text-gray-400 transition hover:text-gray-700"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>
      <div className="grid min-h-0 grid-cols-[280px_1fr_300px]">
      <aside className="flex flex-col overflow-hidden border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">대화</h2>
          <p className="text-xs text-gray-500">{conversations.length}건</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {conversations.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">아직 대화 없음</div>
          )}
          {STATUS_ORDER.map((statusKey) => {
            const items = grouped[statusKey];
            return (
              <section key={statusKey} className="mb-3">
                <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <span>{STATUS_LABEL[statusKey]}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div className="px-3 py-1 text-[11px] text-gray-300">없음</div>
                ) : (
                  <ul className="space-y-0.5">
                    {items.map((c) => (
                      <li key={c.id}>
                        <ConversationListItem
                          conversation={c}
                          selected={selectedId === c.id}
                          onSelect={() => setSelectedId(c.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </aside>

      <section className="flex flex-col overflow-hidden">
        {selectedId && selectedConversation ? (
          <>
            <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
              <div className="space-y-0.5">
                <div className="font-mono text-xs text-gray-500">
                  {selectedId.slice(0, 8)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">
                  {STATUS_LABEL[selectedConversation.status]}
                </div>
              </div>
              <div className="flex gap-2">
                {selectedConversation.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => changeStatus('active')}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                  >
                    응대 시작
                  </button>
                )}
                {selectedConversation.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => changeStatus('closed')}
                    className="rounded bg-gray-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
                  >
                    응대 종료
                  </button>
                )}
              </div>
            </header>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="text-xs text-gray-400">메시지 없음</div>
              ) : (
                <ul className="space-y-2">
                  {messages.map((m) => {
                    const isManager = m.sender_type === 'manager';
                    const sending = m.localStatus === 'sending';
                    const failed = m.localStatus === 'failed';
                    const internal = m.is_internal;
                    return (
                      <li
                        key={m.tempId ?? m.id}
                        className={`flex flex-col ${isManager ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[60%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm transition-opacity ${
                            internal
                              ? failed
                                ? 'border border-red-300 bg-red-50 text-red-800'
                                : sending
                                  ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border border-amber-300 bg-amber-100 text-amber-900'
                              : isManager
                                ? failed
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : sending
                                    ? 'bg-blue-300 text-white'
                                    : 'bg-blue-600 text-white'
                                : m.sender_type === 'customer'
                                  ? 'border border-gray-200 bg-white text-gray-900'
                                  : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="mb-0.5 text-[10px] opacity-70">
                            {renderSenderLabel(m)}
                          </div>
                          {m.body}
                        </div>
                        <div className="mt-0.5 text-[10px] text-gray-400">
                          {failed
                            ? '전송 실패'
                            : sending
                              ? '전송 중…'
                              : messageTime(m.created_at)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <form
              onSubmit={send}
              className={`border-t p-3 transition-colors ${internalMode ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}
            >
              <div className="mb-2 flex items-center gap-2 text-[11px]">
                <div
                  role="tablist"
                  aria-label="메시지 모드"
                  className="inline-flex rounded-full bg-gray-100 p-0.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!internalMode}
                    onClick={() => setInternalMode(false)}
                    disabled={isClosed}
                    className={`rounded-full px-3 py-1 font-medium transition disabled:opacity-50 ${
                      !internalMode
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    고객 응대
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={internalMode}
                    onClick={() => setInternalMode(true)}
                    disabled={isClosed}
                    className={`rounded-full px-3 py-1 font-medium transition disabled:opacity-50 ${
                      internalMode
                        ? 'bg-amber-200 text-amber-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    내부 메모
                  </button>
                </div>
                {internalMode && (
                  <span className="text-amber-700">
                    이 메시지는 고객에게 보이지 않습니다
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isClosed
                      ? '대화가 종료되었습니다'
                      : internalMode
                        ? '내부 메모를 입력하세요'
                        : '응답을 입력하세요'
                  }
                  disabled={isClosed}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending || isClosed}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${internalMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  전송
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            왼쪽에서 대화를 선택하세요
          </div>
        )}
      </section>

      <aside className="overflow-hidden border-l border-gray-200 bg-white">
        <ProfilePanel conversation={selectedConversation} />
      </aside>
      </div>
    </main>
  );
}
