/**
 * Pre-AI deflection workflow used by the widget when a fresh customer first
 * opens the chat. Each branch click sends a `customer` message (the button
 * label) and a `system` message (the next node's prompt) so the conversation
 * thread carries enough context for an admin to pick up later.
 *
 * Replaces the F11 FAQ-embedding path — see DOCS/DECISION.md §7.2.
 */

export interface WorkflowOption {
  id: string;
  label: string;
  next: string; // node id
}

export interface WorkflowNode {
  id: string;
  prompt: string; // shown as a system message bubble
  options?: WorkflowOption[]; // branches; absent on leaves
}

export const WORKFLOW_INTRO_NODE_ID = 'intro';
export const WORKFLOW_ROOT_NODE_ID = 'root';

export const WORKFLOW_NODES: Record<string, WorkflowNode> = {
  intro: {
    id: 'intro',
    prompt:
      '안녕하세요! 코지 스튜디오 상담 채널입니다. 자주 묻는 질문은 아래 버튼으로, 그 외 문의는 상담원과 직접 이야기하실 수 있어요.',
    // intro is rendered specially — single "문의하기" button, no system message yet.
  },

  root: {
    id: 'root',
    prompt: '어떤 점이 궁금하신가요?',
    options: [
      { id: 'reservation', label: '예약 문의', next: 'reservation' },
      { id: 'facility', label: '시설 안내', next: 'facility' },
      { id: 'checkin', label: '체크인·체크아웃', next: 'checkin' },
      { id: 'payment', label: '결제·환불', next: 'payment' },
    ],
  },

  reservation: {
    id: 'reservation',
    prompt: '예약 관련 문의를 도와드릴게요. 어떤 부분이 궁금하세요?',
    options: [
      { id: 'long-term', label: '장기 예약', next: 'long-term-answer' },
      { id: 'short-term', label: '단기 예약', next: 'short-term-answer' },
      { id: 'price', label: '가격 문의', next: 'price-answer' },
    ],
  },
  'long-term-answer': {
    id: 'long-term-answer',
    prompt:
      '한 달 단위 예약은 주 단위 대비 약 15% 할인되며, 30일 이상 머무시면 청소 1회 무료가 포함됩니다. 정확한 일정 견적은 상담원이 도와드릴 수 있어요.',
  },
  'short-term-answer': {
    id: 'short-term-answer',
    prompt:
      '하루~2주 단위 단기 예약 모두 가능합니다. 입실일 기준 14일 이전 예약은 100% 환불되며, 최소 1박부터 받고 있어요.',
  },
  'price-answer': {
    id: 'price-answer',
    prompt:
      '가격은 시즌과 기간에 따라 달라집니다. 예약 페이지에서 일자를 선택하시면 즉시 확인 가능하며, 장기 할인을 원하시면 상담원으로 연결해 드릴게요.',
  },

  facility: {
    id: 'facility',
    prompt: '시설 관련 어떤 점이 궁금하세요?',
    options: [
      { id: 'wifi', label: 'Wi-Fi', next: 'wifi-answer' },
      { id: 'parking', label: '주차', next: 'parking-answer' },
      { id: 'amenities', label: '가전·침구', next: 'amenities-answer' },
    ],
  },
  'wifi-answer': {
    id: 'wifi-answer',
    prompt:
      '100Mbps+ 광랜이 객실 안에 설치되어 있어요. SSID와 비밀번호는 입실 안내 문자에 함께 보내드립니다.',
  },
  'parking-answer': {
    id: 'parking-answer',
    prompt:
      '건물 내 주차는 자리에 따라 유료 협의 가능하며, 인근 공영주차장도 도보권에 있어요. 자세한 위치는 상담원이 알려드릴 수 있어요.',
  },
  'amenities-answer': {
    id: 'amenities-answer',
    prompt:
      '풀 옵션 가전(세탁기, 인덕션, 전자레인지, 냉장고)과 침구·수건·기본 세면용품이 모두 비치되어 있어 별도 준비 없이 입주 가능해요.',
  },

  checkin: {
    id: 'checkin',
    prompt: '체크인·체크아웃 관련 어떤 점이 궁금하세요?',
    options: [
      { id: 'checkin-time', label: '체크인 시간', next: 'checkin-time-answer' },
      { id: 'doorlock', label: '도어락 비밀번호', next: 'doorlock-answer' },
      { id: 'luggage', label: '짐 보관', next: 'luggage-answer' },
    ],
  },
  'checkin-time-answer': {
    id: 'checkin-time-answer',
    prompt:
      '체크인은 입실일 오후 3시부터, 체크아웃은 퇴실일 오전 11시까지입니다. 일찍 도착하시거나 늦게 떠나셔야 하는 경우 상담원과 협의 가능해요.',
  },
  'doorlock-answer': {
    id: 'doorlock-answer',
    prompt:
      '도어락 비밀번호는 매 예약마다 새로 설정되며, 체크인 당일 오전에 입실 안내 문자로 함께 보내드려요.',
  },
  'luggage-answer': {
    id: 'luggage-answer',
    prompt:
      '체크인 전·체크아웃 후 짐 보관은 사정에 따라 가능합니다. 정확한 일정은 상담원과 직접 조율 부탁드려요.',
  },

  payment: {
    id: 'payment',
    prompt: '결제·환불 관련 어떤 점이 궁금하세요?',
    options: [
      { id: 'methods', label: '결제 방법', next: 'methods-answer' },
      { id: 'refund', label: '환불 정책', next: 'refund-answer' },
    ],
  },
  'methods-answer': {
    id: 'methods-answer',
    prompt:
      '신용카드·계좌이체·간편결제 모두 지원합니다. 장기 예약의 경우 분할 결제도 가능하며, 자세한 내용은 상담원에게 문의해 주세요.',
  },
  'refund-answer': {
    id: 'refund-answer',
    prompt:
      '예약일 기준 14일 이전 취소는 100% 환불, 7~13일 전은 50%, 6일 이내는 환불 불가입니다.',
  },
};
