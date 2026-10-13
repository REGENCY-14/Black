import { businessRules } from "@/config";

/**
 * Dates travel as ISO strings. Africa/Accra is UTC+0 all year (no DST), so UTC day
 * arithmetic is correct for Ghana; formatting still pins the timezone explicitly.
 */
const DAY_MS = 86_400_000;
const tz = businessRules.timezone;

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: tz,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: tz,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "short" });

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

/** Whole days from `from` to `to` (negative if `to` is earlier), by Accra calendar day. */
export function daysBetween(from: string | Date, to: string | Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.round((b - a) / DAY_MS);
}

function startOfDay(d: string | Date): number {
  const t = new Date(d).getTime();
  return t - (((t % DAY_MS) + DAY_MS) % DAY_MS);
}

/** Balance is due `dueDaysBeforeArrival` days before the container arrives. */
export function balanceDueDate(
  expectedArrival: string,
  daysBefore: number = businessRules.balance.dueDaysBeforeArrival,
): string {
  return addDays(expectedArrival, -daysBefore);
}

/** True when the balance due date is today or earlier, so only full payment makes sense. */
export function isBalanceDuePassed(expectedArrival: string, now: Date = new Date()): boolean {
  return daysBetween(now, balanceDueDate(expectedArrival)) <= 0;
}

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDayMonth = (iso: string) => dayMonthFmt.format(new Date(iso));
/** "14 Dec 2026, 10:12" in Africa/Accra. */
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export function dateTileParts(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return { day: dayFmt.format(d), month: monthFmt.format(d) };
}

/** Expected delivery window label, for example "14 to 21 Dec 2026". */
export function formatArrivalWindow(expectedArrival: string, spreadDays = 7): string {
  const end = addDays(expectedArrival, spreadDays);
  const sameMonth = monthFmt.format(new Date(expectedArrival)) === monthFmt.format(new Date(end));
  return sameMonth
    ? `${dayFmt.format(new Date(expectedArrival))} to ${formatDate(end)}`
    : `${formatDayMonth(expectedArrival)} to ${formatDate(end)}`;
}

/** Human countdown: "in 38 days", "tomorrow", "today", "3 days ago". */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const n = daysBetween(now, iso);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
