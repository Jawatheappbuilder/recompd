import { useMemo } from "react";
import { analyseTraining, suggestedMuscles } from "../lib/training-analysis";
import { since, useTrainingData } from "../lib/training-data";
import { useUserPreferences } from "../lib/user-preferences";

export function useTrainingGuidance() {
  const data = useTrainingData();
  const [preferences] = useUserPreferences();
  return useMemo(() => {
    const now = Date.now();
    const analysis = analyseTraining(data?.workouts ?? [], since("4W", now), now, preferences.goals);
    return { analysis, suggestions: suggestedMuscles(analysis) };
  }, [data?.workouts, preferences.goals]);
}
