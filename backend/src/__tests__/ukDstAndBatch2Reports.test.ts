import {
  ukDateStr,
  ukTimeHHMM,
  ukDayOfWeek,
  ukDaysBetween,
  ukSlotStartUtcMs,
  isUkSlotDue,
} from '../utils/ukTime';

describe('UK Daylight Saving Time (BST <-> GMT) & Midnight Rollover Hardening', () => {
  test('Saturday 24 Oct 2026 -> Sunday 25 Oct 2026 UK midnight rollover occurs at 23:00Z (not 00:00Z)', () => {
    const beforeUkMidnight = new Date('2026-10-24T22:59:30Z'); // 23:59:30 BST Saturday
    const afterUkMidnight  = new Date('2026-10-24T23:00:30Z'); // 00:00:30 BST Sunday

    expect(ukDateStr(beforeUkMidnight)).toBe('2026-10-24');
    expect(ukTimeHHMM(beforeUkMidnight)).toBe('23:59');
    expect(ukDayOfWeek(beforeUkMidnight)).toBe(6); // Saturday

    expect(ukDateStr(afterUkMidnight)).toBe('2026-10-25');
    expect(ukTimeHHMM(afterUkMidnight)).toBe('00:00');
    expect(ukDayOfWeek(afterUkMidnight)).toBe(0); // Sunday
  });

  test('Repeated 01:00–01:59 hour on Sunday 25 Oct 2026 NEVER re-locks an already-due 01:30 medication', () => {
    // 01:30 BST is 2026-10-25T00:30:00Z
    expect(ukSlotStartUtcMs('2026-10-25', '01:30')).toBe(Date.parse('2026-10-25T00:30:00Z'));

    // Before 01:30 BST (01:15 BST = 00:15Z): NOT due yet
    expect(isUkSlotDue('2026-10-25', '01:30', new Date('2026-10-25T00:15:00Z'))).toBe(false);

    // At 01:30 BST (00:30Z): DUE
    expect(isUkSlotDue('2026-10-25', '01:30', new Date('2026-10-25T00:30:00Z'))).toBe(true);

    // CRITICAL REGRESSION CASE: 35 minutes AFTER 01:30 BST, clocks fall back to 01:05 GMT (01:05Z)!
    // Plain HH:MM comparison ("01:30" > "01:05") used to FALSELY re-lock 01:30 meds with 403!
    const afterFallback0105Gmt = new Date('2026-10-25T01:05:00Z');
    expect(ukTimeHHMM(afterFallback0105Gmt)).toBe('01:05');
    expect(isUkSlotDue('2026-10-25', '01:30', afterFallback0105Gmt)).toBe(true);
  });

  test('Morning 08:00 medications shift smoothly from 07:00Z (Saturday BST) to 08:00Z (Sunday GMT)', () => {
    expect(ukSlotStartUtcMs('2026-10-24', '08:00')).toBe(Date.parse('2026-10-24T07:00:00Z'));
    expect(ukSlotStartUtcMs('2026-10-25', '08:00')).toBe(Date.parse('2026-10-25T08:00:00Z'));

    // At 07:30Z on Sunday 25 Oct 2026, UK time is only 07:30 GMT — 08:00 med must NOT be due yet!
    expect(isUkSlotDue('2026-10-25', '08:00', new Date('2026-10-25T07:30:00Z'))).toBe(false);
    // At 08:00Z on Sunday 25 Oct 2026, UK time reaches 08:00 GMT — 08:00 med becomes due!
    expect(isUkSlotDue('2026-10-25', '08:00', new Date('2026-10-25T08:00:00Z'))).toBe(true);
  });

  test('60-minute grace window NEVER wraps backwards into yesterday at 00:00–00:59 UK midnight', () => {
    // At 00:30 UK time on Sunday 25 Oct 2026 (23:30Z Saturday):
    // Plain `ukTimeHHMM(now - 60m)` produced `"23:30"` and marked 08:00, 12:00, 18:00, 22:00 meds as MISSED!
    const sunday0030Bst = new Date('2026-10-24T23:30:00Z');
    for (const slot of ['00:00', '08:00', '12:00', '18:00', '22:00']) {
      expect(isUkSlotDue('2026-10-25', slot, sunday0030Bst, 60)).toBe(false);
    }

    // At 01:00 BST (00:00Z), the 00:00 slot is now exactly 60 real minutes overdue, while 08:00 is still false:
    const sunday0100Bst = new Date('2026-10-25T00:00:00Z');
    expect(isUkSlotDue('2026-10-25', '00:00', sunday0100Bst, 60)).toBe(true);
    expect(isUkSlotDue('2026-10-25', '08:00', sunday0100Bst, 60)).toBe(false);

    // Across the 01:00 BST -> 01:00 GMT fallback: a 01:15 BST med (00:15Z) becomes 60m overdue at 01:15Z (01:15 GMT), NOT before!
    expect(isUkSlotDue('2026-10-25', '01:15', new Date('2026-10-25T00:45:00Z'), 60)).toBe(false);
    expect(isUkSlotDue('2026-10-25', '01:15', new Date('2026-10-25T01:15:00Z'), 60)).toBe(true);
  });

  test('ukDaysBetween counts exact UK calendar days across 25-hour autumn and 23-hour spring DST days', () => {
    // 25-hour day across Sunday 25 Oct 2026
    expect(ukDaysBetween('2026-10-24', '2026-10-25')).toBe(1);
    expect(ukDaysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(ukDaysBetween('2026-10-18', '2026-10-25')).toBe(7);

    // 23-hour day across Sunday 28 Mar 2027 (spring forward)
    expect(ukDaysBetween('2027-03-27', '2027-03-28')).toBe(1);
    expect(ukDaysBetween('2027-03-27', '2027-03-29')).toBe(2);
  });

  test('Spring forward non-existent 01:30 slot becomes due cleanly at 02:00 BST (01:00Z)', () => {
    expect(isUkSlotDue('2027-03-28', '01:30', new Date('2027-03-28T00:59:00Z'))).toBe(false);
    expect(isUkSlotDue('2027-03-28', '01:30', new Date('2027-03-28T01:00:00Z'))).toBe(true);
  });
});
