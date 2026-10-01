import { Capacitor } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";

export type StepsStatus = "loading" | "web" | "unavailable" | "disconnected" | "connected" | "error";
export type StepsSnapshot = { status: StepsStatus; today: number; sevenDayAverage: number; days: { date: string; value: number }[] };

const empty = (status: StepsStatus): StepsSnapshot => ({ status, today: 0, sevenDayAverage: 0, days: [] });
const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const isNativeHealthAvailable = () => Capacitor.isNativePlatform();

export async function requestStepsAccess(): Promise<StepsSnapshot> {
  if (!isNativeHealthAvailable()) return empty("web");
  try {
    const available = await Health.isAvailable();
    if (!available.available) return empty("unavailable");
    const auth = await Health.requestAuthorization({ read: ["steps"], write: [] });
    if (!auth.readAuthorized.includes("steps")) return empty("disconnected");
    return readSteps();
  } catch {
    return empty("error");
  }
}

export async function readSteps(): Promise<StepsSnapshot> {
  if (!isNativeHealthAvailable()) return empty("web");
  try {
    const available = await Health.isAvailable();
    if (!available.available) return empty("unavailable");
    const auth = await Health.checkAuthorization({ read: ["steps"], write: [] });
    if (!auth.readAuthorized.includes("steps")) return empty("disconnected");

    const today = startOfLocalDay(new Date());
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    const result = await Health.queryAggregated({
      dataType: "steps",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucket: "day",
      aggregation: "sum",
    });
    const values = new Map(result.samples.map((sample) => [dateKey(new Date(sample.startDate)), Math.round(sample.value)]));
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date: dateKey(date), value: values.get(dateKey(date)) ?? 0 };
    });
    const todaySteps = days[6]?.value ?? 0;
    const sevenDayAverage = Math.round(days.reduce((sum, day) => sum + day.value, 0) / 7);
    return { status: "connected", today: todaySteps, sevenDayAverage, days };
  } catch {
    return empty("error");
  }
}

export async function openHealthConnectSettings() {
  if (isNativeHealthAvailable()) await Health.openHealthConnectSettings();
}
