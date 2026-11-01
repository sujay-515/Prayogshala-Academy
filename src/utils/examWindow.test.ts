import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getGrandTestWindow,
  getLeaderboardWindowStart,
  formatCountdown,
  WINDOW_MS,
} from './examWindow';

// Nepal is UTC+05:45; Friday 11:00 NPT === Friday 05:15 UTC.
const FRIDAY_OPEN_UTC = '2026-11-06T05:15:00.000Z';
const TUESDAY_CLOSE_UTC = '2026-11-10T18:14:59.999Z';

test('Grand Test is closed just before Friday 11:00 NPT and opens on the hour', () => {
  const before = getGrandTestWindow(new Date('2026-11-06T05:14:00Z'));
  assert.equal(before.isOpen, false);
  assert.equal(before.opensAt.toISOString(), FRIDAY_OPEN_UTC);
  assert.equal(before.closesAt.toISOString(), TUESDAY_CLOSE_UTC);

  const atOpen = getGrandTestWindow(new Date(FRIDAY_OPEN_UTC));
  assert.equal(atOpen.isOpen, true);
  assert.equal(atOpen.opensAt.toISOString(), FRIDAY_OPEN_UTC);
});

test('Grand Test stays open from Friday through Tuesday and reports the same window', () => {
  for (const iso of ['2026-11-06T05:15:00Z', '2026-11-07T12:00:00Z', '2026-11-09T01:00:00Z']) {
    const window = getGrandTestWindow(new Date(iso));
    assert.equal(window.isOpen, true, `expected open at ${iso}`);
    assert.equal(window.opensAt.toISOString(), FRIDAY_OPEN_UTC);
    assert.equal(window.closesAt.toISOString(), TUESDAY_CLOSE_UTC);
  }
});

test('Grand Test is open at the final second and closed right after', () => {
  assert.equal(getGrandTestWindow(new Date('2026-11-10T18:14:00Z')).isOpen, true);
  const closed = getGrandTestWindow(new Date('2026-11-10T18:15:00Z')); // Wed 00:00 NPT
  assert.equal(closed.isOpen, false);
  assert.equal(closed.opensAt.toISOString(), '2026-11-13T05:15:00.000Z');
});

test('Wednesday and Thursday point at the upcoming Friday window', () => {
  const wednesday = getGrandTestWindow(new Date('2026-11-11T06:00:00Z'));
  assert.equal(wednesday.isOpen, false);
  assert.equal(wednesday.opensAt.toISOString(), '2026-11-13T05:15:00.000Z');

  const thursday = getGrandTestWindow(new Date('2026-11-12T06:00:00Z'));
  assert.equal(thursday.isOpen, false);
  assert.equal(thursday.opensAt.toISOString(), '2026-11-13T05:15:00.000Z');
});

test('leaderboard window start follows the open window or the last one', () => {
  const open = getLeaderboardWindowStart(new Date('2026-11-08T00:00:00Z'));
  assert.equal(open.toISOString(), FRIDAY_OPEN_UTC);

  // Wednesday: the window that just closed started on the previous Friday (Nov 6).
  const closed = getLeaderboardWindowStart(new Date('2026-11-11T06:00:00Z'));
  assert.equal(closed.toISOString(), FRIDAY_OPEN_UTC);
});

test('formatCountdown renders days, hours and minutes', () => {
  assert.equal(formatCountdown(0), '0m');
  assert.equal(formatCountdown(90 * 1000), '2m');
  assert.equal(formatCountdown(3 * 60 * 60 * 1000), '3h 0m');
  assert.equal(formatCountdown((2 * 24 + 4) * 60 * 60 * 1000), '2d 4h');
});
