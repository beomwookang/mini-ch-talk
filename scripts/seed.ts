import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'env required: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const MANAGER_ID = '00000000-0000-0000-0000-000000000001';
const NIL = '00000000-0000-0000-0000-000000000000';

const minutes = (n: number) => n * 60 * 1000;
const hours = (n: number) => n * 60 * 60 * 1000;
const days = (n: number) => n * 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

interface MessageDef {
  sender: 'customer' | 'manager';
  body: string;
  offsetMin: number;
  is_internal?: boolean;
  read_by_other?: boolean;
}

interface ConversationDef {
  customer_key: string;
  status: 'pending' | 'active' | 'closed';
  openedAtAgo: number;
  closedAfterMin?: number;
  reopened_count?: number;
  messages: MessageDef[];
}

interface CustomerSeed {
  key: string;
  anonymous_id: string;
  identified_at?: string;
  name?: string;
  email?: string;
  visit_count: number;
  created_at: string;
}

async function truncate() {
  console.log('truncate…');
  // FK order
  await sb.from('messages').delete().neq('id', NIL);
  await sb.from('conversations').delete().neq('id', NIL);
  await sb.from('customer_sessions').delete().neq('id', NIL);
  await sb.from('customers').delete().neq('id', NIL);
  await sb.from('managers').delete().neq('id', NIL);
}

async function seedManager() {
  console.log('manager…');
  const { error } = await sb.from('managers').insert({
    id: MANAGER_ID,
    email: 'demo-manager@example.com',
    name: '데모 매니저',
    online_status: 'online',
    last_seen_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function seedCustomers(): Promise<Map<string, { id: string }>> {
  console.log('customers…');
  const seeds: CustomerSeed[] = [
    {
      key: 'C1',
      anonymous_id: 'anon_DemoNew000001',
      visit_count: 1,
      created_at: ago(minutes(15)),
    },
    {
      key: 'C2',
      anonymous_id: 'anon_DemoReturn001',
      visit_count: 3,
      created_at: ago(days(7)),
    },
    {
      key: 'C3',
      anonymous_id: 'anon_KimJaehyun001',
      identified_at: ago(days(2)),
      name: '김재현',
      email: 'kim@example.com',
      visit_count: 2,
      created_at: ago(days(3)),
    },
    {
      key: 'C4',
      anonymous_id: 'anon_ParkSeoyeon01',
      identified_at: ago(days(1)),
      name: '박서연',
      email: 'park@example.com',
      visit_count: 1,
      created_at: ago(days(1) + hours(3)),
    },
    {
      key: 'C5',
      anonymous_id: 'anon_LeeJiwon0001',
      identified_at: ago(days(6)),
      name: '이지원',
      email: 'lee@example.com',
      visit_count: 4,
      created_at: ago(days(7)),
    },
  ];

  const rows = seeds.map((s) => ({
    anonymous_id: s.anonymous_id,
    identified_at: s.identified_at,
    name: s.name,
    email: s.email,
    visit_count: s.visit_count,
    created_at: s.created_at,
  }));
  const { data, error } = await sb.from('customers').insert(rows).select('*');
  if (error) throw error;

  const map = new Map<string, { id: string }>();
  data!.forEach((row, idx) => {
    map.set(seeds[idx].key, { id: row.id as string });
  });
  return map;
}

async function seedSessions(map: Map<string, { id: string }>) {
  console.log('sessions…');
  const visitCounts: Record<string, number> = {
    C1: 1,
    C2: 3,
    C3: 2,
    C4: 1,
    C5: 4,
  };
  const rows: Record<string, unknown>[] = [];
  for (const [key, c] of map) {
    const total = visitCounts[key];
    for (let i = 0; i < total; i++) {
      rows.push({
        customer_id: c.id,
        started_at: ago(
          days(total - i - 1) + minutes(Math.floor(Math.random() * 60)),
        ),
        url: '/stay',
        referrer: i === 0 ? null : 'https://www.google.com/',
        user_agent: 'Mozilla/5.0 (demo-seed)',
      });
    }
  }
  const { error } = await sb.from('customer_sessions').insert(rows);
  if (error) throw error;
}

const CONVERSATIONS: ConversationDef[] = [
  // Conv 1 — C1 익명 신규, pending
  {
    customer_key: 'C1',
    status: 'pending',
    openedAtAgo: minutes(8),
    messages: [
      {
        sender: 'customer',
        body: '체크인 시간이 어떻게 되나요?',
        offsetMin: 0,
      },
      {
        sender: 'customer',
        body: '오늘 도착이 조금 늦어질 것 같아서요',
        offsetMin: 1,
      },
      {
        sender: 'customer',
        body: '늦어도 입실 가능할까요?',
        offsetMin: 2,
      },
    ],
  },
  // Conv 2 — C2 익명 재방문, active
  {
    customer_key: 'C2',
    status: 'active',
    openedAtAgo: hours(1) + minutes(20),
    messages: [
      {
        sender: 'customer',
        body: 'wifi 비번 어떻게 되나요?',
        offsetMin: 0,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '안녕하세요! 와이파이 정보는 입실 안내 문자에 SSID와 비밀번호 함께 보내드리고 있어요 :)',
        offsetMin: 5,
      },
      {
        sender: 'customer',
        body: '감사합니다',
        offsetMin: 12,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '추가로 궁금하신 점 있으시면 편하게 문의주세요!',
        offsetMin: 15,
      },
      {
        sender: 'customer',
        body: '혹시 짐 보관 가능한가요?',
        offsetMin: 65,
      },
      {
        sender: 'customer',
        body: '체크인 전에요',
        offsetMin: 66,
      },
    ],
  },
  // Conv 3 — C3 김재현, active + 인터널 노트
  {
    customer_key: 'C3',
    status: 'active',
    openedAtAgo: minutes(45),
    messages: [
      {
        sender: 'customer',
        body: '체크인은 몇 시부터 가능한가요?',
        offsetMin: 0,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '오후 3시부터 가능합니다 :)',
        offsetMin: 3,
      },
      {
        sender: 'customer',
        body: '혹시 더 일찍 가능할까요? 1시쯤 도착할 것 같아서요',
        offsetMin: 5,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '오늘은 청소 일정상 2시 30분 정도까지는 당겨드릴 수 있을 것 같습니다',
        offsetMin: 8,
      },
      {
        sender: 'customer',
        body: '좋네요 감사합니다!',
        offsetMin: 10,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '두 번째 방문 — 지난번 라운지 이용 OK였음. 친절 응대',
        offsetMin: 12,
        is_internal: true,
      },
      {
        sender: 'customer',
        body: '그리고 주차장도 있나요?',
        offsetMin: 25,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '네 건물 내 주차 가능하며, 자리에 따라 유료입니다. 도보권에서 오시는 분은 따로 필요 없으세요!',
        offsetMin: 28,
      },
    ],
  },
  // Conv 4 — C4 박서연, closed
  {
    customer_key: 'C4',
    status: 'closed',
    openedAtAgo: days(1) + hours(2),
    closedAfterMin: 35,
    messages: [
      {
        sender: 'customer',
        body: '도어락 비밀번호는 입실 당일 알려주시는 건가요?',
        offsetMin: 0,
      },
      {
        sender: 'manager',
        body: '네 맞습니다. 체크인 당일 오전 입실 안내 문자에 함께 보내드려요',
        offsetMin: 3,
      },
      {
        sender: 'customer',
        body: '감사합니다 그리고 수건이랑 침구는 따로 챙겨가야 하나요?',
        offsetMin: 8,
      },
      {
        sender: 'manager',
        body: '수건, 침구, 기본 세면용품 모두 비치되어 있어 그대로 오셔도 됩니다 :)',
        offsetMin: 11,
      },
      { sender: 'customer', body: '넵 알겠습니다', offsetMin: 15 },
      {
        sender: 'manager',
        body: '혹시 더 궁금하신 점 있으시면 편하게 문의주세요',
        offsetMin: 17,
      },
      {
        sender: 'customer',
        body: '환불 정책은 어떻게 되나요?',
        offsetMin: 22,
      },
      {
        sender: 'manager',
        body: '예약일 기준 14일 이전 100% 환불, 7~13일 50%, 6일 이내 환불 불가입니다',
        offsetMin: 25,
      },
    ],
  },
  // Conv 5 — C5 이지원, active + 인터널 노트
  {
    customer_key: 'C5',
    status: 'active',
    openedAtAgo: hours(2),
    messages: [
      {
        sender: 'customer',
        body: '안녕하세요, 이번에도 잘 부탁드립니다',
        offsetMin: 0,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '안녕하세요 이지원 님! 오랜만이에요 :)',
        offsetMin: 2,
      },
      {
        sender: 'customer',
        body: '이번엔 한 달 정도 머물 예정이에요',
        offsetMin: 5,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '4번째 방문, 정시 체크아웃 — 장기 예약 우선 후보',
        offsetMin: 7,
        is_internal: true,
      },
      {
        sender: 'manager',
        body: '장기 예약 환영합니다! 한 달 단위는 별도 할인 적용돼요',
        offsetMin: 10,
      },
      {
        sender: 'customer',
        body: '오 어떻게 되나요?',
        offsetMin: 15,
        read_by_other: true,
      },
      {
        sender: 'manager',
        body: '주 단위 대비 약 15% 할인되며, 30일 이상 머무시는 경우 청소 1회 무료 포함입니다',
        offsetMin: 18,
      },
      {
        sender: 'customer',
        body: '좋네요, 그럼 진행해주세요',
        offsetMin: 60,
      },
    ],
  },
  // Conv 6 — C5 closed, reopened_count=1
  {
    customer_key: 'C5',
    status: 'closed',
    openedAtAgo: days(3),
    closedAfterMin: 60,
    reopened_count: 1,
    messages: [
      {
        sender: 'customer',
        body: '체크아웃 시간이 11시인가요?',
        offsetMin: 0,
      },
      {
        sender: 'manager',
        body: '네 오전 11시까지 부탁드립니다',
        offsetMin: 3,
      },
      {
        sender: 'customer',
        body: '혹시 12시까지 가능할까요?',
        offsetMin: 5,
      },
      {
        sender: 'manager',
        body: '다음 손님 입실 일정상 11시 30분까지는 가능하실 것 같아요',
        offsetMin: 7,
      },
      { sender: 'customer', body: '감사합니다', offsetMin: 10 },
      // 운영자 응대 종료 → 이후 customer 추가 문의 → reopen
      {
        sender: 'customer',
        body: '그리고 주차권 하나 더 받을 수 있을까요? 친구가 잠깐 들러서요',
        offsetMin: 35,
      },
      {
        sender: 'manager',
        body: '네 가능합니다, 입실 시 안내 부탁드릴게요',
        offsetMin: 40,
      },
      { sender: 'customer', body: '감사합니다 :)', offsetMin: 45 },
    ],
  },
  // Conv 7 — C5 closed, reopened_count=0
  {
    customer_key: 'C5',
    status: 'closed',
    openedAtAgo: days(6),
    closedAfterMin: 25,
    messages: [
      {
        sender: 'customer',
        body: '안녕하세요, 첫 방문인데 위치 안내 부탁드릴 수 있을까요?',
        offsetMin: 0,
      },
      {
        sender: 'manager',
        body: '안녕하세요! 입실 당일 자세한 동선과 함께 안내드릴게요',
        offsetMin: 4,
      },
      {
        sender: 'customer',
        body: '근처 지하철 어디인가요?',
        offsetMin: 8,
      },
      {
        sender: 'manager',
        body: '도보 7분 거리에 지하철역 있으며, 시내 주요 권역까지 30분 안쪽이에요',
        offsetMin: 12,
      },
      { sender: 'customer', body: '넵 감사합니다', offsetMin: 18 },
      { sender: 'manager', body: '편안한 여행 되세요 :)', offsetMin: 20 },
    ],
  },
];

async function seedConversations(map: Map<string, { id: string }>) {
  console.log('conversations + messages…');
  for (const def of CONVERSATIONS) {
    const customer = map.get(def.customer_key);
    if (!customer) throw new Error(`unknown customer key: ${def.customer_key}`);
    const opened = Date.now() - def.openedAtAgo;

    const closed_at =
      def.status === 'closed' && def.closedAfterMin != null
        ? new Date(opened + def.closedAfterMin * 60 * 1000).toISOString()
        : null;

    const { data: conv, error: convErr } = await sb
      .from('conversations')
      .insert({
        customer_id: customer.id,
        status: def.status,
        opened_at: new Date(opened).toISOString(),
        closed_at,
        reopened_count: def.reopened_count ?? 0,
        assignee_id: def.status === 'pending' ? null : MANAGER_ID,
      })
      .select('*')
      .single();
    if (convErr) throw convErr;

    const msgRows = def.messages.map((msg, idx) => {
      const created = new Date(opened + msg.offsetMin * 60 * 1000);
      let read_at: string | null = null;
      if (def.status === 'closed') {
        read_at = new Date(created.getTime() + 60_000).toISOString();
      } else if (msg.read_by_other) {
        read_at = new Date(created.getTime() + 30_000).toISOString();
      }
      return {
        conversation_id: conv.id,
        sender_type: msg.sender,
        sender_id: msg.sender === 'customer' ? customer.id : MANAGER_ID,
        body: msg.body,
        is_internal: msg.is_internal ?? false,
        sequence: idx + 1,
        read_at,
        created_at: created.toISOString(),
      };
    });
    const { error: msgErr } = await sb.from('messages').insert(msgRows);
    if (msgErr) throw msgErr;
  }
}

async function main() {
  console.log('🌱 seeding…');
  await truncate();
  await seedManager();
  const map = await seedCustomers();
  await seedSessions(map);
  await seedConversations(map);
  console.log('✅ done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
