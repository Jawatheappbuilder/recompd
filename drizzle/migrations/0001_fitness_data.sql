CREATE TABLE public.workouts (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 120),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_sec INTEGER NOT NULL CHECK (duration_sec >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own workouts select" ON public.workouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own workouts insert" ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own workouts update" ON public.workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own workouts delete" ON public.workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX workouts_user_started_idx ON public.workouts (user_id, started_at DESC);

CREATE TABLE public.workout_exercises (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  workout_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  exercise_key TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 120),
  muscles TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT NOT NULL,
  superset_with TEXT,
  sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (user_id, workout_id, position),
  FOREIGN KEY (user_id, workout_id) REFERENCES public.workouts (user_id, id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;
GRANT ALL ON public.workout_exercises TO service_role;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own workout exercises select" ON public.workout_exercises FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own workout exercises insert" ON public.workout_exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own workout exercises update" ON public.workout_exercises FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own workout exercises delete" ON public.workout_exercises FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.bodyweight_entries (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  kg NUMERIC(5,1) NOT NULL CHECK (kg > 0 AND kg < 500),
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bodyweight_entries TO authenticated;
GRANT ALL ON public.bodyweight_entries TO service_role;
ALTER TABLE public.bodyweight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bodyweight select" ON public.bodyweight_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own bodyweight insert" ON public.bodyweight_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own bodyweight update" ON public.bodyweight_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own bodyweight delete" ON public.bodyweight_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.saved_workouts (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 120),
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_workouts TO authenticated;
GRANT ALL ON public.saved_workouts TO service_role;
ALTER TABLE public.saved_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved select" ON public.saved_workouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own saved insert" ON public.saved_workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own saved update" ON public.saved_workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own saved delete" ON public.saved_workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.custom_exercises (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  muscles TEXT[] NOT NULL CHECK (cardinality(muscles) >= 1),
  equipment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_exercises TO authenticated;
GRANT ALL ON public.custom_exercises TO service_role;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own custom select" ON public.custom_exercises FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own custom insert" ON public.custom_exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own custom update" ON public.custom_exercises FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own custom delete" ON public.custom_exercises FOR DELETE TO authenticated USING (auth.uid() = user_id);