/** Read-only Apple Shortcuts import. Data is stored on this device, never sent to a server. */
export type AppleHealthDay = { date: string; steps: number; activeCalories?: number; averageHeartRate?: number };
const prefix = "recomp-apple-health-v1:";
const validDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00"));
const number = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined;
export function parseAppleHealthImport(text: string): AppleHealthDay[] {
  if (text.length > 100_000) throw new Error("Import is too large");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("Paste valid JSON from Apple Shortcuts"); }
  const items = Array.isArray(raw) ? raw : raw && typeof raw === "object" && "days" in raw ? (raw as {days:unknown}).days : [raw];
  if (!Array.isArray(items) || items.length === 0 || items.length > 90) throw new Error("Supply 1–90 days of data");
  const days = items.map((item): AppleHealthDay => {
    if (!item || typeof item !== "object") throw new Error("Each day must be an object");
    const r = item as Record<string, unknown>;
    if (!validDate(r.date)) throw new Error("Use date format YYYY-MM-DD");
    const steps = number(r.steps, 200_000);
    if (steps === undefined || !Number.isInteger(steps)) throw new Error("Steps must be a whole number from 0 to 200000");
    const calories = r.activeCalories === undefined ? undefined : number(r.activeCalories, 15000);
    const heartRate = r.averageHeartRate === undefined ? undefined : number(r.averageHeartRate, 250);
    if (r.activeCalories !== undefined && calories === undefined) throw new Error("Invalid activeCalories");
    if (r.averageHeartRate !== undefined && (heartRate === undefined || heartRate < 20)) throw new Error("Invalid averageHeartRate");
    return { date:r.date as string, steps, ...(calories === undefined ? {} : {activeCalories:calories}), ...(heartRate === undefined ? {} : {averageHeartRate:heartRate}) };
  });
  return [...new Map(days.map(day => [day.date,day])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function loadAppleHealth(userId: string): AppleHealthDay[] {
  if (!userId || typeof window === "undefined") return [];
  try { return parseAppleHealthImport(localStorage.getItem(prefix + userId) || "[]"); } catch { return []; }
}
export function saveAppleHealth(userId: string, days: AppleHealthDay[]) {
  if (!userId) throw new Error("Sign in to import Apple Health data");
  const merged = [...new Map([...loadAppleHealth(userId),...days].map(day=>[day.date,day])).values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90);
  localStorage.setItem(prefix + userId, JSON.stringify(merged));
  window.dispatchEvent(new Event("recomp-apple-health-changed"));
  return merged;
}
export function clearAppleHealth(userId: string) {
  if (!userId) return;
  localStorage.removeItem(prefix + userId);
  window.dispatchEvent(new Event("recomp-apple-health-changed"));
}
