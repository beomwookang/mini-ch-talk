import Image from 'next/image';
import Link from 'next/link';

const GITHUB_URL = 'https://github.com/beomwookang/mini-ch-talk';
const REPORT_BASE = `${GITHUB_URL}/blob/main/report`;

export default function LandingPage() {
  return (
    <main className="bg-white text-gray-900">
      <div className="mx-auto max-w-[760px] px-6">
        <Hero />
        <DocumentLinks />
        <SectionFocus />
        <SectionTimeline />
        <SectionKpi />
        <SectionArchitecture />
      </div>
    </main>
  );
}

function Hero() {
  return (
    <header className="pt-[120px] pb-[60px] sm:pt-[140px] sm:pb-[72px]">
      <p className="mb-3 text-sm font-semibold text-blue-500">
        FDE 사전 과제 — 미니 채널톡
      </p>
      <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-[2.75rem]">
        Mini Channel Talk
      </h1>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/stay"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          데모 사이트 →
        </Link>
        <Link
          href="/admin?as=demo-manager"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-400 hover:bg-gray-50"
        >
          어드민 콘솔 →
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-400 hover:bg-gray-50"
        >
          GitHub ↗
        </a>
      </div>
    </header>
  );
}

function DocumentLinks() {
  const items: Array<{
    label: string;
    href: string;
    external?: boolean;
  }> = [
    {
      label: '데모 체크리스트',
      href: '/guide',
    },
    {
      label: '의사결정 문서',
      href: `${REPORT_BASE}/DECISION.md`,
      external: true,
    },
    {
      label: 'KPI 시트',
      href: `${REPORT_BASE}/KPI_SHEET.md`,
      external: true,
    },
    {
      label: '아키텍처 메모',
      href: `${REPORT_BASE}/ARCHITECTURE.md`,
      external: true,
    },
  ];
  return (
    <section className="mb-[100px] sm:mb-[120px]">
      <ul className="space-y-2 text-[1.05rem]">
        {items.map((it) => (
          <li key={it.label}>
            {it.external ? (
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 hover:underline"
              >
                {it.label} ↗
              </a>
            ) : (
              <Link
                href={it.href}
                className="font-bold text-blue-600 hover:underline"
              >
                {it.label} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="mb-3 inline-block text-xs font-bold uppercase tracking-[0.08em] text-blue-500">
      {children}
    </span>
  );
}

function InlineLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue-600 hover:underline"
      >
        {children} ↗
      </a>
    );
  }
  return (
    <Link href={href} className="font-semibold text-blue-600 hover:underline">
      {children} →
    </Link>
  );
}

function SectionFocus() {
  return (
    <section className="mb-[100px] sm:mb-[120px]">
      <SectionLabel>01 — Focus</SectionLabel>
      <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        고객 접점에 집중
      </h2>
      <p className="mb-4 text-[1.05rem] leading-relaxed text-gray-600">
        채널톡이 다루는 영역은 메시저, 팀챗, CRM, 워크플로우, ALF, 도큐먼트,
        마케팅까지 넓습니다. 그래서 기능 단위로 분류하기 보다는, 각각의 기능이 공통적으로 어떤 방향을 가리키는가를 고민했습니다.
      </p>
      <div className="my-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-[1.05rem] font-medium text-gray-800">
        결국 채널톡의 코어는, “고객과 맞닿는 접점과 컨텍스트가 흩어지지 않게 한 곳에 모이도록 하는 것”에 있다고 생각했습니다.
        ALF, 자동화, CRM 같은 기능 역시 이 코어를 뒷받침하기 위한 부가가치라고 생각했습니다.
      </div>
      <p className="mb-4 text-[1.05rem] leading-relaxed text-gray-600">
        과제 안내 사항에서 “애매한 기능 10개보다 완성된 기능 1개가 낫다”고 언급해주셨듯이,
        제한 된 시간 내에서 가장 중요한 것은 고객과 운영자가 만나는 접점의 흐름을 완성도 높게 구현하는 것이라고 판단했습니다. — <strong>고객과 운영자가 만나는 접점</strong>의 흐름을 끝까지 단단히 구현하고, 그 과정의 UX 디테일까지 신경쓰는 방향으로 진행했습니다.
      </p>
    </section>
  );
}

function SectionTimeline() {
  return (
    <section className="mb-[100px] sm:mb-[120px]">
      <SectionLabel>02 — Time & Process</SectionLabel>
      <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        실투입 시간과 로드맵
      </h2>
      <p className="mb-6 text-[1.05rem] leading-relaxed text-gray-600">
        과제 진행을 위해 실질적으로 투입 가능한 시간은 목요일/금요일 저녁 시간과 토요일을 포함해 총 15–20시간 정도로 예상했습니다. 
        이 제한된 시간 안에서, 제품 분석과 설계에 충분한 시간을 할애하는 것이 중요하다고 판단했습니다.
      </p>
      <p className="mb-6 text-[1.05rem] leading-relaxed text-gray-600">
        주어진 시간 중의 절반 이상은 채널톡 기능을 분석하고, 그 분석을 바탕으로 코어에 대한 가설을 세우고, 핵심 기능과 구현 스펙 및 범위를 고민하는 데 할애했습니다. 
        또한, 구현과 검증을 포함한 전체 프로세스를 정립하고, 그 과정에서 어떤 프로세스에 AI를 어떻게 활용할지 정의하는 데에도 많은 시간을 투자했습니다.
        결과적으로, 실질적인 구현 및 검증 작업은 토요일 점심부터 시작하여 약 4-6시간 정도 소요되었습니다.
      </p>
    </section>
  );
}

function SectionKpi() {
  return (
    <section className="mb-[100px] sm:mb-[120px]">
      <SectionLabel>03 — KPI</SectionLabel>
      <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        성공적인 운영 지표
      </h2>
      <p className="mb-4 text-[1.05rem] leading-relaxed text-gray-600">
        이렇게 고객 접점에 집중한 구현을 바탕으로, 미니 채널톡의 KPI는 고객사의 customer operations이 잘 굴러가는지를 측정하는 지표로 설정했습니다.
      </p>

      <ul className="my-6 space-y-2 text-[1.0rem] leading-relaxed text-gray-700">
        <li>
          <span className="font-bold">재인식률</span> — 재방문 고객이 같은 사람으로 식별되는 비율
        </li>
        <li>
          <span className="font-bold">프로필 채워짐</span> — 식별된 고객의 이름·이메일이 채워진 비율
        </li>
        <li>
          <span className="font-bold">셀프 해결률</span> — 워크플로우에서 “도움이 됐어요”로 종료된 비율
        </li>
        <li>
          <span className="font-bold">TTFR (median)</span> — 고객 메시지 이후 첫 응답까지의 중앙값
        </li>
        <li>
          <span className="font-bold">활성 대화</span> — 현재 열려 있는 대화 수
        </li>
        <li>
          <span className="font-bold">재오픈률</span> — 닫힌 대화가 다시 열린 비율
        </li>
      </ul>

      <p className="mb-6 text-[1.05rem] leading-relaxed text-gray-600">
        이 지표들을 어드민 콘솔 상단에서 한눈에 확인할 수 있도록 미니 대시보드를 추가했습니다.
      </p>
      <div className="my-6 overflow-hidden rounded-lg border border-gray-200">
        <Image
          src="/kpi-dashboard.png"
          alt="어드민 콘솔 상단 KPI 대시보드"
          width={2650}
          height={326}
          className="h-auto w-full"
        />
      </div>

      <p className="text-[1.05rem] leading-relaxed text-gray-600">
        각 지표에 대한 설명은{' '}
        <InlineLink href={`${REPORT_BASE}/KPI_SHEET.md`} external>
          KPI 시트
        </InlineLink>
        에 정리되어 있습니다.
      </p>
    </section>
  );
}

function SectionArchitecture() {
  return (
    <section className="mb-[100px] sm:mb-[120px]">
      <SectionLabel>04 — Architecture</SectionLabel>
      <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        구현 & 기술 스택
      </h2>
      <p className="mb-4 text-[1.05rem] leading-relaxed text-gray-600">
        디테일한 기술스택이나 구현보다는, 제품 관점에서 제가 결정한 채널톡의 핵심 기능을 잘 보여줄 수 있는 것이 더 중요하다고 생각했습니다.
        따라서 WebSocket, 호스팅과 같은 인프라 레이어는 직접 구현하기보다는 검증된 솔루션을 활용하는 방향으로 결정했습니다.
      </p>
      <ul className="my-6 space-y-3">
        <StackItem k="Realtime + DB" v="Supabase Postgres + Realtime (postgres_changes / Broadcast)" />
        <StackItem k="호스팅 / 프레임워크" v="Vercel + Next.js 14 (App Router) + TypeScript strict" />
        <StackItem k="스타일" v="Tailwind CSS only" />
        <StackItem
          k="직접 구현"
          v="익명 식별(쿠키 + localStorage + 서버 머지), conversation reopen 정책, 워크플로우 트리, KPI 계산"
        />
      </ul>
    </section>
  );
}

function StackItem({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="shrink-0 text-sm font-bold text-gray-900 sm:w-44">
        {k}
      </span>
      <span className="text-[0.97rem] leading-relaxed text-gray-600">{v}</span>
    </li>
  );
}
