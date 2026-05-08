'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Conversation, Message } from '@/lib/types';

// Placeholder — replaced with seed manager UUID in Task 3.4 (auth bypass).
const DEMO_MANAGER_ID = '00000000-0000-0000-0000-000000000001';

export default function AdminPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const scrollRef = useRef<HTMLDivElement>(null);

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
      if (data) setMessages(data as Message[]);
    })();

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
          setMessages((prev) =>
            prev.some((p) => p.id === m.id) ? prev : [...prev, m],
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

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedId,
          sender_type: 'manager',
          sender_id: DEMO_MANAGER_ID,
          body: text,
        }),
      });
      if (!res.ok) {
        console.error('admin send failed', await res.text());
        setInput(text);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="grid h-screen grid-cols-[280px_1fr] bg-gray-50 text-gray-900">
      <aside className="flex flex-col overflow-hidden border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">대화</h2>
          <p className="text-xs text-gray-500">{conversations.length}건</p>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 py-2">
          {conversations.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-400">아직 대화 없음</li>
          )}
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  selectedId === c.id
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-mono text-xs text-gray-500">
                  {c.id.slice(0, 8)}
                </div>
                <div className="text-xs">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-gray-600">
                    {c.status}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-col overflow-hidden">
        {selectedId ? (
          <>
            <header className="border-b border-gray-200 bg-white px-4 py-3">
              <div className="font-mono text-xs text-gray-500">
                {selectedId.slice(0, 8)}
              </div>
            </header>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="text-xs text-gray-400">메시지 없음</div>
              ) : (
                <ul className="space-y-2">
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className={`flex ${m.sender_type === 'manager' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[60%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                          m.sender_type === 'manager'
                            ? 'bg-blue-600 text-white'
                            : m.sender_type === 'customer'
                              ? 'border border-gray-200 bg-white text-gray-900'
                              : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="mb-0.5 text-[10px] opacity-70">
                          {m.sender_type}
                        </div>
                        {m.body}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form
              onSubmit={send}
              className="border-t border-gray-200 bg-white p-3"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="응답을 입력하세요"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
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
    </main>
  );
}
