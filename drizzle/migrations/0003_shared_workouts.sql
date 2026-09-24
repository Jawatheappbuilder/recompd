CREATE TABLE public.shared_workouts (
  token text PRIMARY KEY CHECK (char_length(token) BETWEEN 12 AND 64),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.shared_workouts TO authenticated;
GRANT ALL ON public.shared_workouts TO service_role;
ALTER TABLE public.shared_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own shares select" ON public.shared_workouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own shares insert" ON public.shared_workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own shares delete" ON public.shared_workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_shared_workout(_token text)
RETURNS TABLE (name text, exercises jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT s.name, s.exercises FROM public.shared_workouts s WHERE s.token = _token LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.get_shared_workout(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_workout(text) TO anon, authenticated;