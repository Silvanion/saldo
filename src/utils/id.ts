/**
 * Centralized ID generation utilities.
 * Eliminates duplicate ID generation patterns across the codebase.
 */

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const ID_PREFIXES = {
  transaction: 'tx',
  payment: 'pay',
  goal: 'goal',
  investment: 'inv',
  rule: 'rule',
  debt: 'debt',
  scenario: 'scenario',
  settlement: 'set',
  recurring: 'tx-rec',
  csv: 'tx-csv',
  pdf: 'tx-pdf',
  heal: 'tx-heal',
  financialPlan: 'plan',
  planItem: 'item',
} as const;

/**
 * Type-safe ID generator for specific entity types.
 * Usage: generateEntityId('transaction') -> 'tx-1234567890-abc123'
 */
export function generateEntityId<K extends keyof typeof ID_PREFIXES>(type: K): string {
  return generateId(ID_PREFIXES[type]);
}