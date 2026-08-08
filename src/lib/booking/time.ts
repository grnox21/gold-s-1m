/**
 * Turkey abolished DST in 2016 and has run on a fixed UTC+3 offset
 * ("Europe/Istanbul") ever since — so unlike most timezone handling, a
 * fixed offset here is not a simplification that will bite later, it's
 * just correct. Every working-hour / break / blocked-time value in the
 * database is a local Istanbul wall-clock time; this module is the single
 * place that converts between that and the UTC timestamps stored on
 * `appointments`.
 */
export const ISTANBUL_OFFSET = "+03:00";

/** "YYYY-MM-DD" + "HH:MM[:SS]" (both Istanbul wall-clock) → UTC Date. */
export function istanbulDateTime(dateStr: string, timeStr: string): Date {
  const time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${time}${ISTANBUL_OFFSET}`);
}

/** JS weekday (0=Pazar..6=Cumartesi) for a "YYYY-MM-DD" Istanbul calendar date. */
export function weekdayForDate(dateStr: string): number {
  return istanbulDateTime(dateStr, "12:00:00").getUTCDay();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Half-open interval overlap: [aStart,aEnd) ∩ [bStart,bEnd) ≠ ∅. Touching bounds don't count. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** "HH:MM" Istanbul wall-clock time for a UTC instant, e.g. for slot buttons. */
export function formatIstanbulTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatIstanbulDateLong(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "YYYY-MM-DD" Istanbul calendar date for any instant, e.g. to re-derive
 * the day a stored appointment's start_at falls on. */
export function dateStringFromInstant(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Today's Istanbul calendar date as "YYYY-MM-DD", for min-date checks etc. */
export function todayIstanbul(): string {
  return dateStringFromInstant(new Date());
}

export function nowIstanbulMinutesSinceMidnight(dateStr: string): number {
  const now = new Date();
  if (todayIstanbul() !== dateStr) return -1; // not "today" — no cutoff applies
  const time = formatIstanbulTime(now);
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
