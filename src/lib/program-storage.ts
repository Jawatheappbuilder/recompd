import type { WorkoutExercise } from "@/data/exercises";

export type ProgramMode = "flexible" | "calendar";
export type ProgramStatus = "draft" | "active" | "paused" | "completed";
export type ProgramWorkout = { id: string; name: string; exercises: WorkoutExercise[] };
export type TrainingProgram = {
  id: string;
  name: string;
  goal: "Strength" | "Hypertrophy" | "Fat loss" | "General fitness";
  weeks: number;
  mode: ProgramMode;
  startDate: string;
  weekdays: number[];
  status: ProgramStatus;
  workouts: ProgramWorkout[];
  createdAt: number;
  updatedAt: number;
};

// Phase 1 stores drafts on this device. Cloud-backed storage and the session
// progression engine will be introduced together in the next implementation phase.
const STORAGE_KEY = "recomp-programs-drafts-v1";
const changedEvent = "recomp-programs-changed";

export function loadProgramDrafts(): TrainingProgram[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is TrainingProgram =>
      item !== null && typeof item === "object" && typeof item.id === "string" &&
      typeof item.name === "string" && Array.isArray(item.workouts)
    );
  } catch { return []; }
}

export function saveProgramDraft(program: TrainingProgram) {
  const current = loadProgramDrafts();
  const next = [program, ...current.filter((item) => item.id !== program.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(changedEvent));
}

export function deleteProgramDraft(id: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loadProgramDrafts().filter((item) => item.id !== id)));
  window.dispatchEvent(new Event(changedEvent));
}

export const programsChangedEvent = changedEvent;
