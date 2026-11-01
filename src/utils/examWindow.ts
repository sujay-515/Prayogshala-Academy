/**
 * Weekly Grand Test window.
 *
 * Nepal runs on UTC+05:45 with no daylight saving. The window opens Friday
 * 11:00 NPT and closes Tuesday 23:59:59.999 NPT; Wednesday, Thursday and
 * Friday-before-11:00 are closed.
 */

export const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
export const GRAND_TEST_OPEN_DAY = 5; // Friday
export const GRAND_TEST_OPEN_HOUR = 11;
export const GRAND_TEST_CLOSE_DAY = 2; // Tuesday
export const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface GrandTestWindow {
  isOpen: boolean;
  /** Start of the window that is open now, or of the next window when closed. */
  opensAt: Date;
  /** End of the window that opens at `opensAt`. */
  closesAt: Date;
}

function nepalParts(now: Date) {
  const shifted = new Date(now.getTime() + NEPAL_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    day: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
  };
}

function fromNepalParts(
  year: number,
  month: number,
  date: number,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number
): Date {
  return new Date(Date.UTC(year, month, date, hours, minutes, seconds, ms) - NEPAL_OFFSET_MS);
}

export function getGrandTestWindow(now: Date = new Date()): GrandTestWindow {
  const { year, month, date, day, hours } = nepalParts(now);

  const fridayBeforeOpen = day === GRAND_TEST_OPEN_DAY && hours < GRAND_TEST_OPEN_HOUR;
  const closedDays = day === 3 || day === 4; // Wednesday, Thursday
  const isOpen = !fridayBeforeOpen && !closedDays;

  let opensOffsetDays: number;
  if (isOpen) {
    const daysSinceFriday = (day - GRAND_TEST_OPEN_DAY + 7) % 7;
    opensOffsetDays = -daysSinceFriday;
  } else {
    // Friday before 11:00 → same day; Wednesday → +2; Thursday → +1
    opensOffsetDays = (GRAND_TEST_OPEN_DAY - day + 7) % 7;
  }

  const opensAt = fromNepalParts(
    year,
    month,
    date + opensOffsetDays,
    GRAND_TEST_OPEN_HOUR,
    0,
    0,
    0
  );
  const closesAt = fromNepalParts(
    year,
    month,
    date + opensOffsetDays + 4,
    23,
    59,
    59,
    999
  );

  return { isOpen, opensAt, closesAt };
}

/** Start of the most relevant leaderboard window: the open one, or the last one when closed. */
export function getLeaderboardWindowStart(now: Date = new Date()): Date {
  const window = getGrandTestWindow(now);
  return window.isOpen ? window.opensAt : new Date(window.opensAt.getTime() - WINDOW_MS);
}

export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatNepalTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
