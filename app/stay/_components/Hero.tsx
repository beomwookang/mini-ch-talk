import Image from 'next/image';

const IMAGES = [
  { src: '/room_image_1.jpg', alt: '거실 + 침대 영역' },
  { src: '/room_image_2.jpg', alt: '주방 영역' },
  { src: '/room_image_3.jpg', alt: '욕실' },
];

export function Hero() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-amber-700">서울 시내 · 단기임대</p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Cozy Studio
        </h1>
        <p className="text-lg text-gray-600">
          1인 단기 거주자를 위한 풀 옵션 스튜디오. 교통·식사·일상 동선이 모두 도보권에 닿습니다.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {IMAGES.map((img) => (
          <div
            key={img.src}
            className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="(min-width: 640px) 33vw, 100vw"
              priority={img.src === '/room_image_1.jpg'}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-6 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            공간
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li>· 원룸형 스튜디오 (약 33㎡)</li>
            <li>· 1인 침대 + 데스크 + 소파</li>
            <li>· 풀 옵션 가전 (세탁기, 인덕션, 전자레인지, 냉장고)</li>
            <li>· 분리형 욕실 + 샤워 부스</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            포함된 것
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li>· 전기·수도·가스 (월 요금 포함)</li>
            <li>· 100Mbps+ 고속 Wi-Fi</li>
            <li>· 침구·수건·기본 세면용품</li>
            <li>· 건물 보안 + 엘리베이터</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
