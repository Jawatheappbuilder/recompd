/** Monthly Wrapped uses the viewer's local calendar, not UTC, for release windows. */
export function wrappedMonth(now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
  // First four days: feature the month that just ended. Last four days: preview this month.
  const target = day <= 4 ? new Date(year, month - 1, 1) : new Date(year, month, 1);
  return target;
}
export function wrappedPromoMonth(now = new Date()) {
  const day = now.getDate();
  if (day <= 4 || day >= new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()-3) return wrappedMonth(now);
  return null;
}
export function wrappedLabel(date: Date) {
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}
export function monthBounds(date: Date) {
  return { start: new Date(date.getFullYear(), date.getMonth(), 1).getTime(), end: new Date(date.getFullYear(), date.getMonth()+1, 1).getTime(), prior: new Date(date.getFullYear(), date.getMonth()-1, 1).getTime() };
}
