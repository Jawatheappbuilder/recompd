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


export type WorkoutCaloriesResult = { status: "web" | "unavailable" | "disconnected" | "connected" | "no-match" | "error"; calories?: number };

export async function requestWorkoutCaloriesAccess() {
  if (!isNativeHealthAvailable()) return false;
  try {
    const available = await Health.isAvailable();
    if (!available.available) return false;
    const auth = await Health.requestAuthorization({ read: ["steps", "workouts", "calories", "totalCalories"], write: [] });
    return auth.readAuthorized.includes("workouts") && (auth.readAuthorized.includes("calories") || auth.readAuthorized.includes("totalCalories"));
  } catch {
    return false;
  }
}

/** Match a RECOMP'D session to a Health Connect workout by time overlap, then use its calorie total. */
export async function readWorkoutCalories(startedAt: number, durationSec: number): Promise<WorkoutCaloriesResult> {
  if (!isNativeHealthAvailable()) return { status: "web" };
  try {
    const available = await Health.isAvailable();
    if (!available.available) return { status: "unavailable" };
    const auth = await Health.checkAuthorization({ read: ["workouts", "calories", "totalCalories"], write: [] });
    if (!auth.readAuthorized.includes("workouts") || (!auth.readAuthorized.includes("calories") && !auth.readAuthorized.includes("totalCalories"))) return { status: "disconnected" };

    const workoutEnd = startedAt + durationSec * 1000;
    const padding = 30 * 60 * 1000;
    const result = await Health.queryWorkouts({
      startDate: new Date(startedAt - padding).toISOString(),
      endDate: new Date(workoutEnd + padding).toISOString(),
      limit: 50,
      ascending: true,
    });

    const scored = result.workouts.map((candidate) => {
      const start = Date.parse(candidate.startDate);
      const end = Date.parse(candidate.endDate);
      const overlap = Math.max(0, Math.min(workoutEnd, end) - Math.max(startedAt, start));
      const union = Math.max(workoutEnd, end) - Math.min(startedAt, start);
      return { candidate, score: union > 0 ? overlap / union : 0, overlap };
    }).filter((item) => item.overlap >= Math.min(durationSec * 1000 * 0.35, 15 * 60 * 1000))
      .sort((a, b) => b.score - a.score);

    const match = scored[0]?.candidate;
    if (!match) return { status: "no-match" };
    // Health Connect exercise sessions and calorie records are separate on Android.
    // Sum calorie records across the matched watch session; prefer active calories because
    // this aligns with the exercise calorie figure shown by Samsung Health.
    const calorieTypes = auth.readAuthorized.includes("calories") ? ["calories"] as const : ["totalCalories"] as const;
    for (const dataType of calorieTypes) {
      const samples = await Health.readSamples({
        dataType,
        startDate: match.startDate,
        endDate: match.endDate,
        limit: 500,
        ascending: true,
      });
      const calories = Math.round(samples.samples.reduce((sum, sample) => sum + (Number(sample.value) || 0), 0));
      if (calories > 0) return { status: "connected", calories };
    }
    return { status: "no-match" };
  } catch {
    return { status: "error" };
  }
}
