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
import {
  WORKFLOW_NODES,
  WORKFLOW_ROOT_NODE_ID,
  type WorkflowOption,
} from '@/lib/workflow';

type WidgetMode = 'intro' | 'workflow' | 'chat' | 'resolved';
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
  const [mode, setMode] = useState<WidgetMode>('intro');
  const [currentNodeId, setCurrentNodeId] = useState<string>(
    WORKFLOW_ROOT_NODE_ID,
  );
  const [workflowPath, setWorkflowPath] = useState<WorkflowOption[]>([]);
  const [workflowBusy, setWorkflowBusy] = useState(false);
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
          // Returning customer with an existing thread skips the workflow.
          setMode('chat');
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
      else if (msgsRes.data) {
        // Preserve client-only workflow messages (conversation_id === '')
        // so the user keeps seeing the workflow trail after escalation.
        setMessages((prev) => {
          const wf = prev.filter((m) => m.conversation_id === '');
          return [...wf, ...(msgsRes.data as LocalMessage[])];
        });
      }
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
    if (mode !== 'chat') return false;
    if (!customer || customer.identified_at) return false;
    return messages.some((m) => m.sender_type === 'customer');
  }, [customer, messages, mode]);

  const isClosed = conversationStatus === 'closed';

  async function postMessage(opts: {
    sender_type: 'customer' | 'system';
    body: string;
    activeConvId: string | null;
  }): Promise<{ message: Message; conversation_id: string } | null> {
    if (!customer) return null;
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: opts.activeConvId,
        customer_id: customer.id,
        sender_type: opts.sender_type,
        sender_id: opts.sender_type === 'customer' ? customer.id : null,
        body: opts.body,
      }),
    });
    if (!res.ok) {
      console.error('workflow postMessage failed', await res.text());
      return null;
    }
    return (await res.json()) as { message: Message; conversation_id: string };
  }

  function pushClientLocalMessage(
    sender_type: 'customer' | 'system',
    body: string,
  ) {
    setMessages((prev) => {
      const id = `wf-${sender_type}-${prev.length}-${prev.length === 0 ? 'a' : prev[prev.length - 1]?.id ?? 'a'}`;
      const localMsg: LocalMessage = {
        id: `${id}-${Date.now()}`,
        tempId: id,
        conversation_id: '',
        sender_type,
        sender_id: sender_type === 'customer' ? (customer?.id ?? null) : null,
        body,
        is_internal: false,
        sequence: -1,
        read_at: null,
        created_at: new Date().toISOString(),
        localStatus: 'sent',
      };
      return [...prev, localMsg];
    });
  }

  function postWorkflowEvent(
    event_type: 'started' | 'escalated' | 'resolved',
  ) {
    if (!customer) return;
    void fetch('/api/workflow/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customer.id, event_type }),
      keepalive: true,
    }).catch((err) => console.error('workflow event ping failed', err));
  }

  function startWorkflow() {
    // intro → workflow root. root 노드 prompt를 클라이언트 system 메시지로만 노출 (DB 저장 X).
    const rootNode = WORKFLOW_NODES[WORKFLOW_ROOT_NODE_ID];
    if (rootNode?.prompt) pushClientLocalMessage('system', rootNode.prompt);
    setCurrentNodeId(WORKFLOW_ROOT_NODE_ID);
    setMode('workflow');
    postWorkflowEvent('started');
  }

  function chooseOption(opt: WorkflowOption) {
    if (workflowBusy) return;
    // 분기 흐름은 클라이언트만. DB 저장 X — escalate 시점에만 conversation 생성.
    pushClientLocalMessage('customer', opt.label);
    const nextNode = WORKFLOW_NODES[opt.next];
    if (nextNode?.prompt) pushClientLocalMessage('system', nextNode.prompt);
    setWorkflowPath((prev) => [...prev, opt]);
    setCurrentNodeId(opt.next);
  }

  function markResolved() {
    if (workflowBusy) return;
    pushClientLocalMessage(
      'system',
      '문의가 종료되었습니다. 이용해주셔서 감사합니다 :)',
    );
    postWorkflowEvent('resolved');
    setMode('resolved');
  }

  function restartWorkflow() {
    setMessages([]);
    setWorkflowPath([]);
    setCurrentNodeId(WORKFLOW_ROOT_NODE_ID);
    setMode('intro');
  }

  async function escalateToHuman() {
    if (workflowBusy || !customer) return;
    setWorkflowBusy(true);
    try {
      const pathSummary =
        workflowPath.length > 0
          ? `[사전 안내] ${workflowPath
              .map((p) => p.label)
              .join(' → ')} 단계까지 보고, 상담원께 이어서 문의드릴게요.`
          : '상담원과 직접 이야기하고 싶어요.';

      // 1) path summary를 customer 메시지로 → conversation 생성 (admin 컨텍스트)
      const custRes = await postMessage({
        sender_type: 'customer',
        body: pathSummary,
        activeConvId: conversationId,
      });
      if (!custRes) return;
      const convId = custRes.conversation_id;
      if (!conversationId) setConversationId(convId);

      // 2) "상담원 연결됨" 안내는 customer-side UX 메시지 — admin 노이즈가 되지 않도록
      //    DB 저장하지 않고 client-only LocalMessage로 표시.
      pushClientLocalMessage(
        'system',
        '상담원과 연결되었습니다. 메시지를 보내시면 응대해드릴게요.',
      );

      postWorkflowEvent('escalated');
      setMode('chat');
    } finally {
      setWorkflowBusy(false);
    }
  }

  const currentNode = WORKFLOW_NODES[currentNodeId];
  const isWorkflowLeaf = mode === 'workflow' && !currentNode?.options;

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
        {mode === 'intro' ? (
          <div className="animate-fade-in flex flex-col items-stretch gap-4 px-1 py-2">
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">
                Cozy Studio 상담 채널
              </div>
              <p className="text-xs leading-relaxed text-gray-600">
                {WORKFLOW_NODES.intro.prompt}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => startWorkflow()}
                disabled={!customer || workflowBusy}
                className="animate-fade-in rounded-full border border-blue-300 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-800 shadow-sm transition hover:bg-blue-100 disabled:opacity-50"
              >
                문의하기
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
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
        {mode === 'resolved' && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={restartWorkflow}
              className="animate-fade-in rounded-full border border-blue-300 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-800 shadow-sm transition hover:bg-blue-100"
            >
              다시 문의하기
            </button>
          </div>
        )}
        {mode === 'workflow' && currentNode && (
          <div
            key={`workflow-${currentNodeId}`}
            className="mt-3 flex flex-wrap justify-end gap-1.5"
          >
            {!isWorkflowLeaf &&
              currentNode.options?.map((opt, idx) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => chooseOption(opt)}
                  disabled={workflowBusy}
                  style={{ animationDelay: `${(idx + 1) * 100}ms` }}
                  className="animate-fade-in rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            {isWorkflowLeaf && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentNodeId(WORKFLOW_ROOT_NODE_ID)}
                  disabled={workflowBusy}
                  style={{ animationDelay: '100ms' }}
                  className="animate-fade-in rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                >
                  다른 문의
                </button>
                <button
                  type="button"
                  onClick={() => markResolved()}
                  disabled={workflowBusy}
                  style={{ animationDelay: '200ms' }}
                  className="animate-fade-in rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  도움이 됐어요
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void escalateToHuman()}
              disabled={workflowBusy}
              style={{
                animationDelay: `${((isWorkflowLeaf ? 1 : (currentNode.options?.length ?? 0)) + 1) * 100}ms`,
              }}
              className="animate-fade-in rounded-full border border-blue-300 bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-800 shadow-sm transition hover:bg-blue-100 disabled:opacity-50"
            >
              상담원 직접 문의
            </button>
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
            placeholder={
              mode === 'resolved'
                ? '문의가 종료되었습니다'
                : mode !== 'chat'
                  ? '버튼을 눌러주세요'
                  : isClosed
                    ? '대화가 종료되었습니다'
                    : '메시지를 입력하세요'
            }
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            disabled={!customer || mode !== 'chat'}
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            disabled={!input.trim() || !customer || sending || mode !== 'chat'}
          >
            전송
          </button>
        </div>
      </form>
      </div>
    </>
  );
}
