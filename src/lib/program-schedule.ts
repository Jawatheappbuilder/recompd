import type { TrainingProgram, ProgramMode } from "./program-storage";

export type ProgramOccurrence = {
  id: string;
  templateId: string;
  cycle: number;
  position: number;
  date?: string | undefined;
  status: "upcoming" | "completed" | "skipped";
  completedWorkoutId?: string;
  completedAt?: number;
};

function dateFrom(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12);
}
function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function advance(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function nextWeekday(start: Date, weekday: number) { return advance(start, (weekday - start.getDay() + 7) % 7); }

export function createOccurrences(program: TrainingProgram): ProgramOccurrence[] {
  const start = dateFrom(program.startDate);
  const planned = [];
  for (let cycle = 0; cycle < program.weeks; cycle++) {
    for (let position = 0; position < program.workouts.length; position++) {
      const workout = program.workouts[position]!;
      const weekday = workout.weekday;
      const weekStart = advance(start, cycle * 7);
      const date = program.mode === "calendar" && weekday !== undefined
        ? dateKey(nextWeekday(weekStart, weekday)) : undefined;
      planned.push({ id: program.id + ":" + cycle + ":" + workout.id, templateId: workout.id, cycle, position, ...(date ? { date } : {}), status: "upcoming" as const });
    }
  }
  return planned;
}

export function occurrencesFor(program: TrainingProgram) {
  return program.occurrences ?? createOccurrences(program);
}

export function isPending(occurrence: ProgramOccurrence, currentDate: string) {
  return occurrence.status === "upcoming" && !!occurrence.date && occurrence.date < currentDate;
}
export function resolved(occurrence: ProgramOccurrence) {
  return occurrence.status === "skipped" || occurrence.status === "completed";
}
export function completionStats(program: TrainingProgram) {
  const occurrences = occurrencesFor(program);
  return {
    total: occurrences.length,
    completed: occurrences.filter((occurrence) => occurrence.status === "completed").length,
    skipped: occurrences.filter((occurrence) => occurrence.status === "skipped").length,
    pending: occurrences.filter((occurrence) => isPending(occurrence, dateKey(new Date()))).length,
    remaining: occurrences.filter((occurrence) => !resolved(occurrence)).length,
  };
}

/** Switching modes never modifies completed/skipped entries or session identities. */
export function replan(program: TrainingProgram, mode: ProgramMode, startDate = dateKey(new Date())): TrainingProgram {
  const existing = occurrencesFor(program);
  const unresolved = existing.filter((occurrence) => !resolved(occurrence));
  const start = dateFrom(startDate);
  let flexibleIndex = 0;
  const future = unresolved.map((occurrence) => {
    if (mode === "flexible") return { ...occurrence, date: undefined };
    const template = program.workouts.find((w) => w.id === occurrence.templateId);
    if (template?.weekday === undefined) return { ...occurrence, date: undefined };
    const cycleOffset = Math.floor(flexibleIndex / Math.max(1, program.workouts.length));
    flexibleIndex++;
    return { ...occurrence, date: dateKey(nextWeekday(advance(start, cycleOffset * 7), template.weekday)) };
  });
  const pendingById = new Map(future.map((entry) => [entry.id, entry]));
  return { ...program, mode, occurrences: existing.map((entry) => pendingById.get(entry.id) ?? entry), updatedAt: Date.now() };
}

export function updateOccurrence(program: TrainingProgram, id: string, patch: Partial<ProgramOccurrence>): TrainingProgram {
  return { ...program, occurrences: occurrencesFor(program).map((occurrence) =>
    occurrence.id === id ? { ...occurrence, ...patch } : occurrence), updatedAt: Date.now() };
}
