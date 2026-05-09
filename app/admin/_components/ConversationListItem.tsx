'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { messageTime } from '@/lib/relative-time';
import type { Conversation, Customer, Message } from '@/lib/types';

const PREVIEW_MAX = 40;

interface Props {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
}

function customerLabel(customer: Customer | null, fallbackId: string): string {
  if (customer?.name) return customer.name;
  if (customer?.anonymous_id) {
    return `익명 ${customer.anonymous_id.slice(-4)}`;
  }
  return fallbackId.slice(0, 8);
}

function truncate(text: string, max = PREVIEW_MAX): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function ConversationListItem({
  conversation,
  selected,
  onSelect,
}: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabaseRef = useRef(createSupabaseBrowserClient());

  useEffect(() => {
    const sb = supabaseRef.current;
    let cancelled = false;

    (async () => {
      const [custRes, msgRes, unreadRes] = await Promise.all([
        sb
          .from('customers')
          .select('*')
          .eq('id', conversation.customer_id)
          .single(),
        sb
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('sequence', { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('sender_type', 'customer')
          .is('read_at', null),
      ]);
      if (cancelled) return;
      if (custRes.error) console.error('list customer fetch', custRes.error);
      else if (custRes.data) setCustomer(custRes.data as Customer);
      if (msgRes.error) console.error('list message fetch', msgRes.error);
      else setLastMessage((msgRes.data as Message) ?? null);
      if (unreadRes.error) console.error('list unread count', unreadRes.error);
      else setUnreadCount(unreadRes.count ?? 0);
    })();

    const customerChannel = sb
      .channel(`admin:list:customer:${conversation.customer_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${conversation.customer_id}`,
        },
        (payload) => setCustomer(payload.new as Customer),
      )
      .subscribe();

    const messageChannel = sb
      .channel(`admin:list:msg:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setLastMessage(m);
          if (m.sender_type === 'customer' && !m.read_at) {
            setUnreadCount((c) => c + 1);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const before = payload.old as Partial<Message>;
          const after = payload.new as Message;
          // Customer message just got read → decrement unread.
          if (
            after.sender_type === 'customer' &&
            !before.read_at &&
            after.read_at
          ) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(customerChannel);
      sb.removeChannel(messageChannel);
    };
  }, [conversation.id, conversation.customer_id]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
        selected ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium">
          {customerLabel(customer, conversation.id)}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {unreadCount > 0 && (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            {messageTime(lastMessage?.created_at ?? conversation.opened_at)}
          </span>
        </div>
      </div>
      <div className="mt-0.5 truncate text-xs text-gray-500">
        {lastMessage
          ? lastMessage.is_internal
            ? `[내부] ${truncate(lastMessage.body)}`
            : truncate(lastMessage.body)
          : '대화 시작 전'}
      </div>
    </button>
  );
}
