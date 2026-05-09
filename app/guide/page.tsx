import Link from 'next/link';

export default function ChecklistPage() {
  return (
    <main className="bg-white text-gray-900">
      <div className="mx-auto max-w-[820px] px-6">
        <Header />
        <Intro />
        <ChecklistSections />
        <FooterNav />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="pt-[100px] pb-[40px] sm:pt-[120px]">
      <p className="mb-3 text-sm font-semibold text-blue-500">
        Mini Channel Talk
      </p>
      <h1 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
        데모 체크리스트
      </h1>
      <p className="text-[1.05rem] leading-relaxed text-gray-600">
        핵심 기능이 직접 조작 수준에서 정상 동작하는지 항목별로 확인하실 수
        있습니다. 위에서부터 차례로 따라가시면 됩니다.
      </p>
    </header>
  );
}

function Intro() {
  return (
    <section className="mb-[60px] rounded-xl border border-gray-200 bg-gray-50 p-5 sm:mb-[80px]">
      <h2 className="mb-3 text-base font-bold text-gray-900">시작하기 전에</h2>
      <ul className="space-y-2 text-[0.97rem] leading-relaxed text-gray-700">
        <li>
          <strong>Tab A (고객 시점):</strong>{' '}
          <Link
            href="/stay"
            className="font-semibold text-blue-600 hover:underline"
          >
            /stay
          </Link>{' '}
          — 일반 Chrome 창으로 여세요.
        </li>
        <li>
          <strong>Tab B (운영자 시점):</strong>{' '}
          <Link
            href="/admin"
            className="font-semibold text-blue-600 hover:underline"
          >
            /admin
          </Link>{' '}
          — 같은 Chrome 또는 다른 창에서 여세요. (“데모 매니저로 들어가기”
          버튼 클릭)
        </li>
        <li>
          시드 데이터(가짜 고객 5명, 대화 7건)가 미리 들어가 있습니다. 새 대화는
          Tab A에서 위젯의 “문의하기” 분기를 통해 만드실 수 있습니다.
        </li>
        <li>
          <strong>진입 흐름:</strong> 위젯이 열리면 항상 “문의하기” 워크플로우
          트리가 먼저 보입니다. 메시지 입력창은 끝 분기에서{' '}
          <em>“상담원 직접 문의”</em>로 대화가 생성된 뒤 (또는 재방문 시 기존
          thread가 복원된 뒤) 활성화됩니다.
        </li>
      </ul>
    </section>
  );
}

type Section = {
  id: string;
  title: string;
  star?: boolean;
  items: string[];
};

const SECTIONS: Section[] = [
  {
    id: 'A',
    title: '익명 ID 발급과 위젯 진입',
    items: [
      '/stay 첫 방문 시 우하단 챗 버튼이 보이고, 클릭하면 위젯이 부드럽게 열리며 인사 카드와 “문의하기” 분기 버튼이 표시됩니다.',
    ],
  },
  {
    id: 'B',
    title: '양방향 메시징',
    items: [
      '워크플로우 끝에서 “상담원 직접 문의”로 대화가 생성된 뒤 (또는 재방문 시 thread 복원 후), /stay에서 메시지를 보내면 /admin 인박스에 즉시 새 대화가 등장하고 운영자 응답이 위젯에 자동 도착합니다.',
    ],
  },
  {
    id: 'C',
    title: '식별 폼과 프로필 패널',
    items: [
      '“상담원 직접 문의”로 대화가 생성된 뒤 위젯에 인라인 식별 폼이 노출됩니다. 이름·이메일을 입력하면 /admin ProfilePanel이 익명에서 실명으로 자동 갱신됩니다.',
    ],
  },
  {
    id: 'D',
    title: '재방문 인식',
    star: true,
    items: [
      '모든 탭을 닫고 다시 /stay에 들어가면 위젯이 이전 대화를 자동 복원하고 식별 폼은 다시 뜨지 않습니다.',
      '/admin에서 같은 고객을 선택하면 이름·방문 횟수·과거 대화·마지막 세션이 한 화면에 모입니다.',
    ],
  },
  {
    id: 'E',
    title: '대화 상태 머신과 자동 reopen',
    items: [
      '/admin에서 “응대 시작 → 응대 종료”를 누르면 위젯에 amber 종료 배너가 표시되며 입력창은 살아 있습니다.',
      '종료 상태에서 고객이 다시 메시지를 보내면 같은 대화가 자동으로 reopen되어 “대기” 그룹으로 돌아갑니다.',
    ],
  },
  {
    id: 'F',
    title: '운영자 온라인/오프라인',
    items: [
      '/admin이 열려 있을 때 /stay 위젯 헤더에 운영자 online 점이 ping 애니메이션과 함께 표시되고, /admin을 닫으면 30초 안에 “운영자 부재중”으로 전환됩니다.',
    ],
  },
  {
    id: 'G',
    title: '메시지 읽음 표시',
    items: [
      '/admin에서 대화를 열면 /stay 본인 말풍선 옆에 “읽음” 표시가 도착합니다.',
    ],
  },
  {
    id: 'H',
    title: '낙관적 UI와 상대 시간',
    items: [
      '메시지를 보내면 즉시 화면에 표시되며 회색(전송 중)에서 진한 색(전송 완료)으로 전환되고, 시간은 “방금 · 3분 전 · 오늘 14:30” 식의 상대 표시로 보입니다.',
    ],
  },
  {
    id: 'I',
    title: '사이드바 강화와 unread 뱃지',
    items: [
      '사이드바 각 행에 표시명(실명 또는 “익명 xxxx”) · 마지막 메시지 미리보기 · 상대 시각이 보입니다.',
      '/admin을 닫아둔 상태에서 고객이 메시지를 보내면 해당 행에 빨간 unread 뱃지가 카운트로 표시되며, 대화를 열면 0이 되어 사라집니다.',
    ],
  },
  {
    id: 'J',
    title: '타이핑 인디케이터',
    items: [
      '한쪽에서 입력 중일 때 다른 쪽 메시지 영역 하단에 점 3개 인디케이터가 뜨고, 3초 무음 시 사라집니다.',
    ],
  },
  {
    id: 'K',
    title: '인터널 노트',
    items: [
      '/admin 입력창 위 “내부 메모” 탭에서 보낸 메시지는 amber 배경으로 운영자 화면에만 표시되고, /stay 위젯에는 절대 노출되지 않습니다.',
    ],
  },
  {
    id: 'L',
    title: 'KPI 대시보드',
    items: [
      '/admin 상단 6장 카드(재인식률 ★ · 프로필 채워짐 ★ · 셀프 해결률 ★ · TTFR · 활성 대화 · 재오픈률)의 i 표시를 클릭하면 정의·측정법·고객사 의미 안내창이 열립니다.',
    ],
  },
  {
    id: 'M',
    title: '운영자 인증 우회 (데모용)',
    items: [
      '/admin 첫 진입 시 “데모 매니저로 들어가기” 버튼으로 자동 로그인되고, 사이드바 헤더에 운영자 이름이 표시됩니다.',
    ],
  },
  {
    id: 'N',
    title: '워크플로우 트리와 셀프 해결률',
    items: [
      '위젯이 열리면 인사 카드 아래에 “문의하기” 분기 버튼이 항상 먼저 표시됩니다 — 메시지 입력창은 “상담원 직접 문의”로 대화가 생성되어야 활성화됩니다.',
      '분기를 따라가 끝에서 “도움이 됐어요”를 누르면 /admin 인박스에 대화가 만들어지지 않고 KPI 셀프 해결률만 갱신됩니다. “상담원 직접 문의”를 선택하면 그제야 path summary가 운영자에게 송신되며 대화가 생성되고 입력창이 활성화됩니다.',
    ],
  },
];

function ChecklistSections() {
  return (
    <section className="mb-[60px] space-y-10 sm:mb-[80px]">
      {SECTIONS.map((s) => (
        <ChecklistSection key={s.id} section={s} />
      ))}
    </section>
  );
}

function ChecklistSection({ section }: { section: Section }) {
  return (
    <article>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-blue-500">
          {section.id}
        </span>
        <h2 className="text-xl font-bold leading-tight tracking-tight text-gray-900 sm:text-2xl">
          {section.title}
          {section.star && (
            <span className="ml-2 align-middle text-amber-500">★</span>
          )}
        </h2>
      </div>
      <ul className="space-y-2.5">
        {section.items.map((text, i) => (
          <ChecklistItem key={i} id={`${section.id}-${i}`} text={text} />
        ))}
      </ul>
    </article>
  );
}

function ChecklistItem({ id, text }: { id: string; text: string }) {
  return (
    <li>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-400 hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
      >
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
        />
        <span className="flex-1 text-[0.97rem] leading-relaxed text-gray-700">
          {text}
        </span>
      </label>
    </li>
  );
}

function FooterNav() {
  return (
    <footer className="border-t border-gray-200 py-12">
      <Link
        href="/"
        className="text-[0.95rem] font-semibold text-blue-600 hover:underline"
      >
        ← 랜딩으로
      </Link>
    </footer>
  );
}
