# Mini Channel Talk

채널톡 서비스를 *고객 컨텍스트 누적* 관점에서 다시 그려본 미니 프로젝트

## Link

- **라이브 URL:** https://mini-ch-talk.vercel.app/
- **고객 시점 데모:** [`/stay`](https://mini-ch-talk.vercel.app/stay)
- **운영자 시점 데모:** [`/admin?as=demo-manager`](https://mini-ch-talk.vercel.app/admin?as=demo-manager)
- **의사결정 문서:** [`report/DECISION.md`](./report/DECISION.md)
- **KPI 시트:** [`report/KPI_SHEET.md`](./report/KPI_SHEET.md)
- **아키텍처 메모:** [`report/ARCHITECTURE.md`](./report/ARCHITECTURE.md)

## 핵심 기능

- 익명 방문자 식별 (쿠키 + localStorage 백업, 30분 inactivity timeout 기반 visit count)
- 양방향 실시간 메시징 + 대화 영속성 (재방문 시 thread 자동 복원)
- 대화 상태 머신 (대기 → 응대중 → 종료) + 고객 측 자동 reopen
- 운영자 콘솔 — 인박스 status 그룹화 기능, 사이드바 미리보기/unread badge, 매니저 presence
- 내부 메모 — 고객 측에 절대 노출되지 않는 내부 메모 기능
- KPI 미니 대시보드 — 재인식률 · 프로필 채워짐 · TTFR · 활성 대화 · 재오픈률 · 셀프 해결률
- FAQ 기반 자동 대응 — 워크플로우 트리 기반 간편 문의 자동 대응

## 기술 스택

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · Supabase (Postgres + Realtime + Service Role) · Vercel.