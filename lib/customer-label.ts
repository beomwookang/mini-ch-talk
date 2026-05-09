import type { Customer } from '@/lib/types';

/**
 * Display label for a customer in admin surfaces:
 * - identified → name
 * - anonymous → "익명 ${last 4 chars of anonymous_id}"
 * - missing → first 8 chars of fallback (e.g. conversation.id)
 */
export function customerLabel(
  customer: Customer | null | undefined,
  fallback: string,
): string {
  if (customer?.name) return customer.name;
  if (customer?.anonymous_id) {
    return `익명 ${customer.anonymous_id.slice(-4)}`;
  }
  return fallback.slice(0, 8);
}
