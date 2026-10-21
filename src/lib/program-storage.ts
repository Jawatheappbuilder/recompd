import type { ProgramOccurrence } from "./program-schedule";
import type { WorkoutExercise } from "@/data/exercises";

export type ProgramMode = "flexible" | "calendar";
export type ProgramStatus = "draft" | "active" | "paused" | "completed";
export type ProgramWorkout = { id: string; name: string; exercises: WorkoutExercise[]; weekday?: number };
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
  occurrences?: ProgramOccurrence[];
  activatedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// Account-backed programs share the existing cloud cache, offline queue, and
// per-user snapshot used by RECOMP'D workouts and scheduled sessions.
import { getCloudData, mutate, useCloudData } from "./cloud-data";
import { useEffect } from "react";

const LEGACY_DRAFTS_KEY = "recomp-programs-drafts-v1";

export const loadProgramDrafts = () => getCloudData()?.programs ?? [];
export function useProgramDrafts() {
  const cloud = useCloudData();
  useEffect(() => {
    if (!cloud) return;
    // Migrate any device-only Phase 1 drafts without replacing newer cloud copies.
    try {
      const old = localStorage.getItem(LEGACY_DRAFTS_KEY);
      if (!old) return;
      const parsed: unknown = JSON.parse(old);
      const drafts = Array.isArray(parsed) ? parsed as TrainingProgram[] : [];
      localStorage.removeItem(LEGACY_DRAFTS_KEY);
      for (const draft of drafts) {
        if (typeof draft?.id === "string" && Array.isArray(draft.workouts) &&
          !cloud.programs.some((program) => program.id === draft.id)) {
          mutate({ kind: "upsertProgram", program: draft });
        }
      }
    } catch { /* no valid legacy drafts */ }
  }, [cloud]);
  return cloud?.programs ?? [];
}

export function saveProgramDraft(program: TrainingProgram) {
  mutate({ kind: "upsertProgram", program });
}
export function deleteProgramDraft(id: string) {
  mutate({ kind: "deleteProgram", id });
}
