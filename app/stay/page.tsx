import { Faq } from './_components/Faq';
import { Hero } from './_components/Hero';
import { Widget } from './_components/Widget';

export default function StayPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl space-y-16 px-6 py-12 sm:py-16">
        <Hero />
        <Faq />
        <footer className="border-t border-gray-200 pt-6 text-xs text-gray-400">
          데모 페이지 · Mini Channel Talk 과제용 가짜 단기임대 사이트
        </footer>
      </div>
      <Widget />
    </main>
  );
}
