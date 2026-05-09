import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const TYPING_THROTTLE_MS = 1500;
export const TYPING_TIMEOUT_MS = 3000;

export type TypingSender = 'customer' | 'manager';

export interface TypingChannelHandle {
  notifyTyping: () => void;
  cleanup: () => void;
}

/**
 * Subscribe to a per-conversation typing broadcast channel and return a
 * notifyTyping() that throttles outbound `typing` events. The caller decides
 * how to render the indicator (we only emit/receive the broadcast payload).
 */
export function createTypingChannel(
  sb: SupabaseClient,
  conversationId: string,
  self: TypingSender,
  onOtherTyping: () => void,
): TypingChannelHandle {
  const channel: RealtimeChannel = sb.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on('broadcast', { event: 'typing' }, (payload) => {
    const sender = (payload?.payload as { sender?: TypingSender } | undefined)
      ?.sender;
    if (!sender || sender === self) return;
    onOtherTyping();
  });

  channel.subscribe();

  let lastSentAt = 0;
  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastSentAt < TYPING_THROTTLE_MS) return;
    lastSentAt = now;
    void channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: self },
    });
  };

  const cleanup = () => {
    sb.removeChannel(channel);
  };

  return { notifyTyping, cleanup };
}
