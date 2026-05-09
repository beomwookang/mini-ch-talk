'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { readAnonIdFromBrowser, writeAnonIdToBrowser } from '@/lib/anon-id';
import { messageTime, relativeTime } from '@/lib/relative-time';
import {
  createTypingChannel,
  TYPING_TIMEOUT_MS,
  type TypingChannelHandle,
} from '@/lib/typing-indicator';
import type {
  Conversation,
  ConversationStatus,
  Customer,
  LocalMessage,
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
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [manager, setManager] = useState<Manager | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingHandleRef = useRef<TypingChannelHandle | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      else if (msgsRes.data) setMessages(msgsRes.data as LocalMessage[]);
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
          setMessages((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, m as LocalMessage];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.map((p) => (p.id === m.id ? { ...p, ...m } : p)),
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
  }, [messages.length, otherTyping]);

  useEffect(() => {
    if (!conversationId) return;
    const sb = supabaseRef.current;
    const handle = createTypingChannel(sb, conversationId, 'customer', () => {
      setOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(
        () => setOtherTyping(false),
        TYPING_TIMEOUT_MS,
      );
    });
    typingHandleRef.current = handle;
    return () => {
      handle.cleanup();
      typingHandleRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId]);

  // Mark incoming manager messages as read while the widget is open.
  useEffect(() => {
    if (!open || !conversationId) return;
    const hasUnreadManager = messages.some(
      (m) => m.sender_type === 'manager' && !m.read_at,
    );
    if (!hasUnreadManager) return;
    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        reader: 'customer',
      }),
    }).catch(() => undefined);
  }, [open, conversationId, messages]);

  async function send() {
    if (!customer || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const tempId = `tmp_${crypto.randomUUID()}`;
    const optimistic: LocalMessage = {
      id: tempId,
      tempId,
      localStatus: 'sending',
      conversation_id: conversationId ?? '',
      sender_type: 'customer',
      sender_id: customer.id,
      body: text,
      is_internal: false,
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
          conversation_id: conversationId,
          customer_id: customer.id,
          sender_type: 'customer',
          sender_id: customer.id,
          body: text,
        }),
      });
      if (!res.ok) {
        console.error('send failed', await res.text());
        setMessages((prev) =>
          prev.map((p) =>
            p.tempId === tempId ? { ...p, localStatus: 'failed' } : p,
          ),
        );
        return;
      }
      const data = (await res.json()) as {
        message: Message;
        conversation_id: string;
      };
      if (!conversationId) setConversationId(data.conversation_id);
      // Replace optimistic placeholder with the server-confirmed row
      // (also dedupes against any Realtime echo arriving for the same id).
      setMessages((prev) => {
        const withoutTemp = prev.filter((p) => p.tempId !== tempId);
        if (withoutTemp.some((p) => p.id === data.message.id)) return withoutTemp;
        return [...withoutTemp, { ...(data.message as LocalMessage), localStatus: 'sent' }];
      });
    } catch (err) {
      console.error('send error', err);
      setMessages((prev) =>
        prev.map((p) =>
          p.tempId === tempId ? { ...p, localStatus: 'failed' } : p,
        ),
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="채팅 열기"
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        className={`fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 ease-out hover:bg-blue-700 ${
          open
            ? 'pointer-events-none translate-y-1 scale-90 opacity-0'
            : 'opacity-100'
        }`}
      >
        <span aria-hidden className="text-2xl leading-none">💬</span>
      </button>

      <div
        aria-hidden={!open}
        className={`fixed bottom-6 right-6 flex h-[500px] w-[350px] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-out ${
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-[0.98] opacity-0'
        }`}
      >
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">호스트</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {manager?.online_status === 'online' ? (
              <span aria-hidden className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
            ) : (
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300"
              />
            )}
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
            {messages.map((m) => {
              const isCustomer = m.sender_type === 'customer';
              const sending = m.localStatus === 'sending';
              const failed = m.localStatus === 'failed';
              return (
                <li
                  key={m.tempId ?? m.id}
                  className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm transition-opacity ${
                      isCustomer
                        ? failed
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : sending
                            ? 'bg-blue-300 text-white'
                            : 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {m.body}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400">
                    {failed ? (
                      <span className="text-red-500">전송 실패</span>
                    ) : sending ? (
                      <span>전송 중…</span>
                    ) : (
                      <>
                        <span>{messageTime(m.created_at)}</span>
                        {isCustomer && m.read_at && <span>· 읽음</span>}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {otherTyping && (
          <div className="mt-2 flex items-start">
            <div className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-2">
              <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
            </div>
          </div>
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
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value) typingHandleRef.current?.notifyTyping();
            }}
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
    </>
  );
}
