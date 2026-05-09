'use client';

import { useEffect, useRef, useState } from 'react';
import type { KpiSnapshot } from '@/lib/kpi';

const REFRESH_MS = 30_000;

interface CardConfig {
  key: keyof KpiSnapshot;
  label: string;
  thesis: boolean;
  format: (value: KpiSnapshot[keyof KpiSnapshot]) => string;
  tooltip: string;
}

function pct(v: number | null): string {
  if (v == null) return '—';
  return `${Math.round(v * 100)}%`;
}

function seconds(v: number | null): string {
  if (v == null) return '—';
  if (v < 60) return `${Math.round(v)}초`;
  const m = Math.floor(v / 60);
  const s = Math.round(v - m * 60);
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function intCount(v: number | null): string {
  if (v == null) return '—';
  return String(v);
}

const CARDS: CardConfig[] = [
  {
    key: 'recognition_rate',
    label: '재인식률',
    thesis: true,
    format: (v) => pct(v as number | null),
    tooltip:
      '전체 customer 중 visit_count > 1인 비율. 재방문한 고객의 비율. (익명 방문자 중 재방문한 비율)',
  },
  {
    key: 'profile_filled_rate',
    label: '프로필 채워짐',
    thesis: true,
    format: (v) => pct(v as number | null),
    tooltip:
      '전체 customer 중 identified_at이 채워진 비율. 익명에서 식별로 넘어간 비율.',
  },
  {
    key: 'ttfr_seconds',
    label: 'TTFR (median)',
    thesis: false,
    format: (v) => seconds(v as number | null),
    tooltip:
      '첫 customer 메시지 → 첫 manager 응답까지 시간의 median. 인터널 노트 제외.',
  },
  {
    key: 'active_conversations',
    label: '활성 대화',
    thesis: false,
    format: (v) => intCount(v as number),
    tooltip: '현재 status=active인 대화 수.',
  },
  {
    key: 'reopen_rate',
    label: '재오픈률',
    thesis: false,
    format: (v) => pct(v as number | null),
    tooltip:
      '종료된 대화 중 reopened_count > 0인 비율. customer가 닫힌 대화를 다시 연 비율.',
  },
  {
    key: 'deflection_rate',
    label: '셀프 해결률',
    thesis: true,
    format: (v) => pct(v as number | null),
    tooltip:
      '워크플로우 명시 결정(자기 해결 또는 상담원 연결) 이벤트 중 "도움이 됐어요"를 누른 비율. 같은 customer의 여러 시도도 각 별개 이벤트로 카운트. 채널 운영 효율의 핵심 지표.',
  },
];

export function KpiCards() {
  const [data, setData] = useState<KpiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [openInfo, setOpenInfo] = useState<keyof KpiSnapshot | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/kpi', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as KpiSnapshot;
        if (!cancelled) setData(json);
      } catch (err) {
        console.error('kpi fetch', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!openInfo) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpenInfo(null);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenInfo(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [openInfo]);

  return (
    <div ref={wrapperRef} className="grid grid-cols-6 gap-2">
      {CARDS.map((card) => {
        const value = data ? card.format(data[card.key]) : '—';
        const isOpen = openInfo === card.key;
        return (
          <div
            key={card.key}
            className="relative rounded-md border border-gray-200 bg-white p-3 shadow-sm transition hover:border-gray-300"
          >
            <div className="flex items-center justify-between gap-1 text-[10px] uppercase tracking-wider text-gray-500">
              <span className="flex items-center gap-1">
                <span>{card.label}</span>
                {card.thesis && (
                  <span aria-label="thesis core" className="text-amber-500">
                    ★
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`${card.label} 설명`}
                aria-expanded={isOpen}
                onClick={() => setOpenInfo(isOpen ? null : card.key)}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[9px] font-semibold normal-case text-gray-500 transition hover:bg-gray-200"
              >
                i
              </button>
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {loading ? '…' : value}
            </div>
            {isOpen && (
              <div
                role="tooltip"
                className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white p-2.5 text-[11px] leading-snug text-gray-600 shadow-lg"
              >
                {card.tooltip}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
