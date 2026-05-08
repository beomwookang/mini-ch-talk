'use client';

import { useEffect, useState } from 'react';
import { readAnonIdFromBrowser, writeAnonIdToBrowser } from '@/lib/anon-id';
import type { Conversation, Customer } from '@/lib/types';

export function Widget() {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const existing = readAnonIdFromBrowser();
    let cancelled = false;

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
        setConversations(data.conversations ?? []);
        writeAnonIdToBrowser(data.customer.anonymous_id);
      })
      .catch((err) => {
        console.error('visitors/init failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
          <div className="text-xs text-gray-500">운영자 응대 가능</div>
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

      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 text-sm">
        <div className="text-gray-500">
          {customer ? '안녕하세요! 무엇을 도와드릴까요?' : '준비 중…'}
        </div>
      </div>

      <form
        className="border-t border-gray-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          // Task 1.3에서 실제 전송 구현
          console.log('TODO Task 1.3: send', input);
          setInput('');
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            disabled={!input.trim()}
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}
