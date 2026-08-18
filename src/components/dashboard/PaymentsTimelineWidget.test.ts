import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  groupPaymentsByTimeline,
  filterPaymentsByRange,
  getActiveSummary,
  getNearestHighlightedPaymentIds,
  getGlobalOverdueCount,
  getDueThisWeekTotal,
  getHorizonSummary,
  getMonthlyOverviewMetrics
} from './PaymentsTimelineWidget';
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
      { id: '1', name: 'Zaległe', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-20',
          currency: "PLN"
    }, // overdue (-5 days)
      { id: '2', name: 'Dzisiaj', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-25',
          currency: "PLN"
    }, // today (0 days)
      { id: '3', name: 'Za 5 dni', amount: 300, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-30',
          currency: "PLN"
    }, // next7Days (5 days)
      { id: '4', name: 'Za 15 dni', amount: 400, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-09',
          currency: "PLN"
    }, // next30Days (15 days)
      { id: '5', name: 'Później', amount: 500, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-09-01',
          currency: "PLN"
    }, // later (> 30 days)
      { id: '6', name: 'Brak daty', amount: 600, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '',
          currency: "PLN"
    }, // ignored
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
      { id: '1', name: 'Later 1', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-05',
          currency: "PLN"
    },
      { id: '2', name: 'Later 2', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-02',
          currency: "PLN"
    },
    ];

    const result = groupPaymentsByTimeline(payments);
    
    expect(result.next30Days[0].name).toBe('Later 2');
    expect(result.next30Days[1].name).toBe('Later 1');
  });
});

describe('filterPaymentsByRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const payments: Payment[] = [
    { id: '1', name: 'Zaległe', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-20',
        currency: "PLN"
    }, // overdue (-5)
    { id: '2', name: 'Dzisiaj', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-25',
        currency: "PLN"
    }, // today (0)
    { id: '3', name: 'Za 5 dni', amount: 300, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-30',
        currency: "PLN"
    }, // week (5)
    { id: '4', name: 'Za 15 dni', amount: 400, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-09',
        currency: "PLN"
    }, // month (15)
    { id: '5', name: 'Za 40 dni', amount: 500, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-09-03',
        currency: "PLN"
    }, // > 30 (40)
    { id: '6', name: 'Brak daty', amount: 600, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '',
        currency: "PLN"
    }, // no date
  ];

  it('all range preserves all payments', () => {
    const result = filterPaymentsByRange(payments, 'all');
    expect(result.length).toBe(6);
  });

  it('overdue range filters only overdue payments', () => {
    const result = filterPaymentsByRange(payments, 'overdue');
    expect(result.length).toBe(1);
    expect(result.map(p => p.id)).toEqual(['1']);
  });

  it('today range filters only today payments', () => {
    const result = filterPaymentsByRange(payments, 'today');
    expect(result.length).toBe(1);
    expect(result.map(p => p.id)).toEqual(['2']);
  });

  it('week range filters overdue, > 6 days, and no-date payments', () => {
    const result = filterPaymentsByRange(payments, 'week');
    expect(result.length).toBe(2);
    expect(result.map(p => p.id)).toEqual(['2', '3']);
  });

  it('month range filters overdue, > 29 days, and no-date payments', () => {
    const result = filterPaymentsByRange(payments, 'month');
    expect(result.length).toBe(3);
    expect(result.map(p => p.id)).toEqual(['2', '3', '4']);
  });
});

describe('getActiveSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates count and total amount correctly from filtered list', () => {
    const payments: Payment[] = [
      { id: '1', name: 'Zaległe', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-20',
          currency: "PLN"
    }, // overdue
      { id: '2', name: 'Dzisiaj', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-25',
          currency: "PLN"
    }, // week
      { id: '3', name: 'Za 5 dni', amount: 300, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-30',
          currency: "PLN"
    }, // week
      { id: '4', name: 'Za 15 dni', amount: 400, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-09',
          currency: "PLN"
    }, // month
      { id: '5', name: 'Brak daty', amount: 500, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '',
          currency: "PLN"
    }, // no date
    ];
    
    const weekFiltered = filterPaymentsByRange(payments, 'week');
    const summary = getActiveSummary(weekFiltered);
    expect(summary.count).toBe(2);
    expect(summary.total).toBe(500); // 200 + 300

    const allFiltered = filterPaymentsByRange(payments, 'all');
    const allSummary = getActiveSummary(allFiltered);
    expect(allSummary.count).toBe(5);
    expect(allSummary.total).toBe(1500);
  });
});

describe('getHorizonSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates overdue, today, week and month correctly', () => {
    const payments: Payment[] = [
      { id: '1', name: 'Zaległe', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-20', currency: 'PLN' },
      { id: '2', name: 'Dzisiaj', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-25', currency: 'PLN' },
      { id: '3', name: 'Za 3 dni', amount: 300, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-28', currency: 'PLN' },
      { id: '4', name: 'Za 20 dni', amount: 400, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-14', currency: 'PLN' },
      { id: '5', name: 'Opłacone', amount: 500, status: 'Opłacono', category: 'Dom', isRecurring: false, dueDate: '2026-07-25', currency: 'PLN' },
    ];

    const result = getHorizonSummary(payments);

    expect(result.overdue).toEqual({ count: 1, total: 100 });
    expect(result.today).toEqual({ count: 1, total: 200 });
    // Week includes today + 3 days = 200 + 300 = 500
    expect(result.week).toEqual({ count: 2, total: 500 });
    // Month includes today + 3 days + 20 days = 200 + 300 + 400 = 900
    expect(result.month).toEqual({ count: 3, total: 900 });
  });
});

describe('getNearestHighlightedPaymentIds', () => {
  it('highlights all payments from today if there are any', () => {
    const today = [{ id: '1' } as Payment, { id: '2' } as Payment];
    const next7Days = [{ id: '3' } as Payment];
    const result = getNearestHighlightedPaymentIds(today, next7Days);
    expect(result.size).toBe(2);
    expect(result.has('1')).toBe(true);
    expect(result.has('2')).toBe(true);
  });

  it('highlights the first payment from next7Days if today is empty', () => {
    const today: Payment[] = [];
    const next7Days = [{ id: '3' } as Payment, { id: '4' } as Payment];
    const result = getNearestHighlightedPaymentIds(today, next7Days);
    expect(result.size).toBe(1);
    expect(result.has('3')).toBe(true);
  });

  it('returns empty set if both today and next7Days are empty', () => {
    const result = getNearestHighlightedPaymentIds([], []);
    expect(result.size).toBe(0);
  });
});

describe('getGlobalOverdueCount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('counts only payments with dueDate in the past', () => {
    const payments: Payment[] = [
      { id: '1', dueDate: '2026-07-20' }, // overdue
      { id: '2', dueDate: '2026-07-24' }, // overdue
      { id: '3', dueDate: '2026-07-25' }, // today
      { id: '4', dueDate: '2026-07-30' }, // future
      { id: '5', dueDate: '' }, // no date
    ] as Payment[];
    expect(getGlobalOverdueCount(payments)).toBe(2);
  });
});

describe('getDueThisWeekTotal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates the total amount of payments due within the next 7 days (including today)', () => {
    const payments: Payment[] = [
      { id: '1', amount: 100, dueDate: '2026-07-20',
          currency: "PLN"
    }, // overdue
      { id: '2', amount: 200, dueDate: '2026-07-24',
          currency: "PLN"
    }, // overdue
      { id: '3', amount: 300, dueDate: '2026-07-25',
          currency: "PLN"
    }, // today
      { id: '4', amount: 400, dueDate: '2026-07-30',
          currency: "PLN"
    }, // 5 days
      { id: '5', amount: 500, dueDate: '2026-08-05',
          currency: "PLN"
    }, // > 6 days
      { id: '6', amount: 600, dueDate: '',
          currency: "PLN"
    }, // no date
    ] as Payment[];

    // Only '3' and '4' are due this week (>= 0 and <= 6 days).
    // 300 + 400 = 700
    expect(getDueThisWeekTotal(payments)).toBe(700);
  });
});

describe('getMonthlyOverviewMetrics & >7 items dataset separation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates monthly overview count, sum, overdue metrics and nearest date correctly', () => {
    const payments: Payment[] = [
      { id: '1', name: 'Zaległe 1', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-20', currency: 'PLN' },
      { id: '2', name: 'Dzisiaj 1', amount: 200, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-25', currency: 'PLN' },
      { id: '3', name: '7 dni 1', amount: 300, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-28', currency: 'PLN' },
      { id: '4', name: '30 dni 1', amount: 400, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-10', currency: 'PLN' },
      { id: '5', name: 'Później 1', amount: 500, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-09-01', currency: 'PLN' },
    ];

    const grouped = groupPaymentsByTimeline(payments);
    const metrics = getMonthlyOverviewMetrics(grouped);

    // Upcoming includes today (200) + 7dni (300) + 30dni (400) = 900
    expect(metrics.count).toBe(3);
    expect(metrics.sum).toBe(900);
    expect(metrics.nearest).toBe('2026-07-25');
    expect(metrics.overdueCount).toBe(1);
    expect(metrics.overdueSum).toBe(100);
  });

  it('regression: when there are more than 7 unpaid payments, compact mode is capped at 7 while monthly overview uses full dataset', () => {
    // 10 payments within the month: 1 overdue, 1 today, 3 in 7 days, 5 in 30 days
    const payments: Payment[] = [
      { id: 'ov-1', name: 'Overdue 1', amount: 50, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-20', currency: 'PLN' },
      { id: 'td-1', name: 'Today 1', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-25', currency: 'PLN' },
      { id: 'w-1', name: 'Week 1', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-26', currency: 'PLN' },
      { id: 'w-2', name: 'Week 2', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-27', currency: 'PLN' },
      { id: 'w-3', name: 'Week 3', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-07-28', currency: 'PLN' },
      { id: 'm-1', name: 'Month 1', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-01', currency: 'PLN' },
      { id: 'm-2', name: 'Month 2', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-05', currency: 'PLN' },
      { id: 'm-3', name: 'Month 3', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-10', currency: 'PLN' },
      { id: 'm-4', name: 'Month 4', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-15', currency: 'PLN' },
      { id: 'm-5', name: 'Month 5', amount: 100, status: 'Do opłacenia', category: 'Dom', isRecurring: false, dueDate: '2026-08-20', currency: 'PLN' },
    ];

    expect(payments.length).toBe(10);

    // 1. Compact list dataset: limited to MAX_ITEMS = 7
    const MAX_ITEMS = 7;
    const sortedFiltered = [...payments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const limitedPayments = sortedFiltered.slice(0, MAX_ITEMS);
    const compactGrouped = groupPaymentsByTimeline(limitedPayments);

    const compactTotalVisibleRows = 
      compactGrouped.overdue.length +
      compactGrouped.today.length +
      compactGrouped.next7Days.length +
      compactGrouped.next30Days.length +
      compactGrouped.later.length;

    expect(compactTotalVisibleRows).toBe(7);

    // 2. Full dataset for monthly overview / Cashflow
    const fullGrouped = groupPaymentsByTimeline(payments);
    const monthlyMetrics = getMonthlyOverviewMetrics(fullGrouped);

    // Must include ALL 9 upcoming payments (1 today + 3 week + 5 month = 900 PLN)
    expect(monthlyMetrics.count).toBe(9);
    expect(monthlyMetrics.sum).toBe(900);
    expect(monthlyMetrics.overdueCount).toBe(1);
    expect(monthlyMetrics.overdueSum).toBe(50);
  });
});


