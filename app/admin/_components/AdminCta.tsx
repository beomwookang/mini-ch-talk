import { startAdminSession } from '../_actions';

export function AdminCta() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            데모 운영자 콘솔
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Mini Channel Talk</h1>
          <p className="text-sm text-gray-500">
            평가용 데모 환경입니다. 데모 매니저로 로그인하면 인박스에서 실시간 응대를
            확인할 수 있어요.
          </p>
        </div>
        <form action={startAdminSession}>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            데모 매니저로 들어가기
          </button>
        </form>
        <p className="text-[11px] leading-relaxed text-gray-400">
          이 데모는 OAuth/패스워드를 우회하기 위해 단일 데모 매니저 cookie를
          사용합니다. 프로덕션에선 SSO + RBAC가 들어갈 자리입니다.
        </p>
      </div>
    </main>
  );
}
