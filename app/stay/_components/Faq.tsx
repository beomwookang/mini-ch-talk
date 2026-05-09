interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: '체크인은 언제부터 가능한가요?',
    answer:
      '체크인은 입실일 오후 3시부터, 체크아웃은 퇴실일 오전 11시까지입니다. 셀프 체크인(도어락 비밀번호)이며, 도착 전에 안내 메시지를 보내드려요.',
  },
  {
    question: '도어락 비밀번호는 어떻게 받나요?',
    answer:
      '결제 확정 후 체크인 당일 오전, 입실 안내 문자에 비밀번호와 출입 동선을 함께 보내드립니다. 비밀번호는 매 예약마다 새로 설정됩니다.',
  },
  {
    question: 'Wi-Fi는 어떻게 연결하나요?',
    answer:
      '입실 안내에 SSID와 비밀번호가 포함되어 있어요. 100Mbps 이상 광랜이며 공유기는 객실 안에 설치되어 있습니다.',
  },
  {
    question: '주차가 가능한가요?',
    answer:
      '건물 내 주차는 별도 협의가 필요하며 자리에 따라 유료입니다. 인근 공영주차장을 이용하시면 더 편하실 거예요. 도보권에서 도착하시는 분은 주차가 따로 필요하지 않습니다.',
  },
  {
    question: '교통편은 어떻게 되나요?',
    answer:
      '인근 지하철역까지 도보 5~10분이며, 시내 주요 권역까지 30분 안쪽으로 닿습니다. 자세한 동선은 입실 안내에 함께 드려요.',
  },
  {
    question: '시설은 어떤 게 있나요?',
    answer:
      '풀 옵션 가전(세탁기, 인덕션, 전자레인지, 냉장고)과 침구·수건·기본 세면용품이 모두 포함되어 있습니다. 별도 준비 없이 바로 입주 가능해요.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '예약일 기준 14일 이전 취소: 100% 환불 / 7~13일 전 취소: 50% 환불 / 6일 이내 취소: 환불 불가. 자세한 내용은 예약 시 약관을 참고해 주세요.',
  },
];

export function Faq() {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
        자주 묻는 질문
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        예약 전 자주 받는 문의 7가지를 정리했어요. 더 궁금한 점은 우측 하단 위젯으로 편하게 물어보세요.
      </p>
      <div className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
        {FAQS.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50">
              <span>{item.question}</span>
              <span
                aria-hidden
                className="text-xs text-gray-400 transition group-open:rotate-180"
              >
                ▼
              </span>
            </summary>
            <div className="px-5 pb-4 text-sm leading-relaxed text-gray-600">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
