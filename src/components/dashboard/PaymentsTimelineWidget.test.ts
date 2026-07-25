import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { groupPaymentsByTimeline } from './PaymentsTimelineWidget';
import { Payment } from '../../types';

describe('groupPaymentsByTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups payments correctly including next 30 days and ignores missing dueDate', () => {
    const payments: Payment[] = [
      { id: '1', name: 'Zaległe', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-20' }, // overdue (-5 days)
      { id: '2', name: 'Dzisiaj', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-25' }, // today (0 days)
      { id: '3', name: 'Za 5 dni', amount: 300, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-30' }, // next7Days (5 days)
      { id: '4', name: 'Za 15 dni', amount: 400, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-09' }, // next30Days (15 days)
      { id: '5', name: 'Później', amount: 500, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-09-01' }, // later (> 30 days)
      { id: '6', name: 'Brak daty', amount: 600, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '' }, // ignored
    ];

    const result = groupPaymentsByTimeline(payments);

    expect(result.overdue.length).toBe(1);
    expect(result.overdue[0].name).toBe('Zaległe');

    expect(result.today.length).toBe(1);
    expect(result.today[0].name).toBe('Dzisiaj');

    expect(result.next7Days.length).toBe(1);
    expect(result.next7Days[0].name).toBe('Za 5 dni');

    expect(result.next30Days.length).toBe(1);
    expect(result.next30Days[0].name).toBe('Za 15 dni');

    expect(result.later.length).toBe(1);
    expect(result.later[0].name).toBe('Później');
    
    // Ignored payment should not be in any list
    const allIds = [
      ...result.overdue, ...result.today, ...result.next7Days, ...result.next30Days, ...result.later
    ].map(p => p.id);
    expect(allIds).not.toContain('6');
  });

  it('sorts payments by dueDate ascending', () => {
    const payments: Payment[] = [
      { id: '1', name: 'Later 1', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-05' },
      { id: '2', name: 'Later 2', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-02' },
    ];

    const result = groupPaymentsByTimeline(payments);
    
    expect(result.next30Days[0].name).toBe('Later 2');
    expect(result.next30Days[1].name).toBe('Later 1');
  });
});
