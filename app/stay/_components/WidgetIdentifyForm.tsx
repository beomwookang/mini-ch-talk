'use client';

import { type FormEvent, useState } from 'react';
import type { Customer } from '@/lib/types';

interface Props {
  customerId: string;
  onIdentified: (customer: Customer) => void;
}

export function WidgetIdentifyForm({ customerId, onIdentified }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/visitors/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          name: name.trim(),
          email: email.trim(),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { customer: Customer };
      onIdentified(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : '제출에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="m-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3"
    >
      <div className="text-xs font-medium text-blue-900">
        이름과 이메일을 알려주시면 답변드릴게요
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름"
        className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
        type="email"
        className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={submitting || !name.trim() || !email.trim()}
        className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? '제출 중…' : '제출'}
      </button>
    </form>
  );
}
