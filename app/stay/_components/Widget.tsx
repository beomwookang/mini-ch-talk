'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { readAnonIdFromBrowser, writeAnonIdToBrowser } from '@/lib/anon-id';
import { relativeTime } from '@/lib/relative-time';
import type {
  Conversation,
  ConversationStatus,
  Customer,
  Manager,
  Message,
} from '@/lib/types';
import { WidgetIdentifyForm } from './WidgetIdentifyForm';

export function Widget() {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [manager, setManager] = useState<Manager | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const existing = readAnonIdFromBrowser();

    fetch('/api/visitors/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymous_id: existing,
        url: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      }),
    })
      .then((r) => r.json())
      .then((data: { customer: Customer; conversations: Conversation[] }) => {
        if (cancelled || !data?.customer) return;
        setCustomer(data.customer);
        writeAnonIdToBrowser(data.customer.anonymous_id);
        if (data.conversations?.length) {
          setConversationId(data.conversations[0].id);
        }
      })
      .catch((err) => {
        console.error('visitors/init failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const sb = supabaseRef.current;
    let cancelled = false;

    (async () => {
      const [msgsRes, convRes] = await Promise.all([
        sb
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('is_internal', false)
          .order('sequence', { ascending: true }),
        sb
          .from('conversations')
          .select('status')
          .eq('id', conversationId)
          .single(),
      ]);
      if (cancelled) return;
      if (msgsRes.error) console.error('widget messages fetch', msgsRes.error);
      else if (msgsRes.data) setMessages(msgsRes.data as Message[]);
      if (convRes.error) console.error('widget conv fetch', convRes.error);
      else if (convRes.data)
        setConversationStatus(convRes.data.status as ConversationStatus);
    })();

    const messagesChannel = sb
      .channel(`widget:messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          if (m.is_internal) return;
          setMessages((prev) =>
            prev.some((p) => p.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .subscribe();

    const convChannel = sb
      .channel(`widget:conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          setConversationStatus(
            (payload.new as Conversation).status,
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(messagesChannel);
      sb.removeChannel(convChannel);
    };
  }, [conversationId]);

  useEffect(() => {
    const sb = supabaseRef.current;
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from('managers')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error('widget manager fetch', error);
      else if (data) setManager(data as Manager);
    })();

    const channel = sb
      .channel('widget:managers')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'managers' },
        (payload) => {
          setManager(payload.new as Manager);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    if (!customer || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          customer_id: customer.id,
          sender_type: 'customer',
          sender_id: customer.id,
          body: text,
        }),
      });
      if (!res.ok) {
        console.error('send failed', await res.text());
        setInput(text);
        return;
      }
      const data = (await res.json()) as {
        message: Message;
        conversation_id: string;
      };
      if (!conversationId) {
        setConversationId(data.conversation_id);
      }
      setMessages((prev) =>
        prev.some((p) => p.id === data.message.id) ? prev : [...prev, data.message],
      );
    } finally {
      setSending(false);
    }
  }

  const showIdentifyForm = useMemo(() => {
    if (!customer || customer.identified_at) return false;
    return messages.some((m) => m.sender_type === 'customer');
  }, [customer, messages]);

  const isClosed = conversationStatus === 'closed';

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="채팅 열기"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
      >
        <span aria-hidden className="text-2xl leading-none">💬</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 flex h-[500px] w-[350px] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">호스트</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              aria-hidden
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                manager?.online_status === 'online'
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
            {manager?.online_status === 'online'
              ? '운영자 응대 가능'
              : `운영자 부재중${manager?.last_seen_at ? ` · ${relativeTime(manager.last_seen_at)}` : ''}`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="닫기"
          className="text-gray-400 transition hover:text-gray-600"
        >
          ✕
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 text-sm">
        {messages.length === 0 ? (
          <div className="text-gray-500">
            {customer ? '안녕하세요! 무엇을 도와드릴까요?' : '준비 중…'}
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`flex ${m.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                    m.sender_type === 'customer'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {m.body}
                </div>
              </li>
            ))}
          </ul>
        )}
        {showIdentifyForm && customer && (
          <WidgetIdentifyForm
            customerId={customer.id}
            onIdentified={(c) => setCustomer(c)}
          />
        )}
      </div>

      {isClosed && (
        <div className="border-t border-gray-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          이전 상담이 종료되었습니다. <br />추가 문의가 있으시면 새로 메시지를 보내주세요.
        </div>
      )}

      <form
        className="border-t border-gray-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            disabled={!customer}
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            disabled={!input.trim() || !customer || sending}
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}
