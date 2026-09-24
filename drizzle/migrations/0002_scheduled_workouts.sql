CREATE TABLE public.scheduled_workouts (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_saved_id TEXT,
  reminder_offset_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  completed_workout_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_workouts TO authenticated;
GRANT ALL ON public.scheduled_workouts TO service_role;
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own scheduled select" ON public.scheduled_workouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own scheduled insert" ON public.scheduled_workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own scheduled update" ON public.scheduled_workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own scheduled delete" ON public.scheduled_workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX scheduled_workouts_upcoming_idx ON public.scheduled_workouts (user_id, scheduled_date) WHERE completed_at IS NULL;
CREATE TRIGGER scheduled_workouts_updated_at BEFORE UPDATE ON public.scheduled_workouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();