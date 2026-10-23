import { z } from "zod";

// Shared (browser + server safe) validation for Apple Health daily summaries.
export const SYNC_TOKEN_PREFIX = "rcmp_hs_";
export const MAX_BODY_BYTES = 2048;
export const RATE_LIMIT_PER_HOUR = 30;
export const HEALTH_TIMEZONE = "Australia/Adelaide";

const intIn = (min: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") value = Number(value.replace(/,/g, ""));
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : value;
  }, z.number().int().min(min).max(max));

const optionalIntIn = (min: number, max: number) =>
  z.preprocess((value) => (value === "" || value === null || value === 0 || value === "0" ? undefined : value), intIn(min, max).optional());

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today's calendar date in Australia (the app's home timezone) as YYYY-MM-DD. */
export function australianToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: HEALTH_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function dayDiff(a: string, b: string) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

export const dailySummarySchema = z.object({
  date: z.string().trim().refine(isRealDate, "date must be YYYY-MM-DD"),
  steps: intIn(0, 200_000),
  activeKcal: optionalIntIn(0, 20_000),
  restingHr: optionalIntIn(20, 250),
  averageHr: optionalIntIn(20, 250),
}).strict();

export type DailySummaryInput = z.infer<typeof dailySummarySchema>;

/** Accepts days from 60 days ago up to tomorrow (Australian time) to allow timezone edges. */
export function isDateInWindow(date: string, now = new Date()): boolean {
  const diff = dayDiff(date, australianToday(now));
  return diff <= 1 && diff >= -60;
}

export type HealthSummary = { day: string; steps: number; active_kcal: number | null; resting_hr: number | null; average_hr: number | null; received_at: string; source: string };
