export type CustomerStatus = 'anonymous' | 'identified';
export type ConversationStatus = 'pending' | 'active' | 'closed';
export type SenderType = 'customer' | 'manager' | 'system';
export type ManagerOnlineStatus = 'online' | 'offline' | 'away';

export interface Customer {
  id: string;
  anonymous_id: string;
  identified_at: string | null;
  name: string | null;
  email: string | null;
  visit_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CustomerSession {
  id: string;
  customer_id: string;
  started_at: string;
  url: string | null;
  referrer: string | null;
  user_agent: string | null;
}

export interface Manager {
  id: string;
  email: string;
  name: string;
  online_status: ManagerOnlineStatus;
  last_seen_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  status: ConversationStatus;
  assignee_id: string | null;
  opened_at: string;
  closed_at: string | null;
  reopened_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  body: string;
  is_internal: boolean;
  sequence: number;
  read_at: string | null;
  created_at: string;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  embedding: number[] | null;
  created_at: string;
}
