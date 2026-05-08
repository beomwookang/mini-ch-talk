import { Widget } from './_components/Widget';

export default function StayPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          마포 한강뷰 스튜디오
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          단기임대 데모 페이지 — 콘텐츠는 Task 3.3에서 채워집니다.
        </p>
      </section>
      <Widget />
    </main>
  );
}
