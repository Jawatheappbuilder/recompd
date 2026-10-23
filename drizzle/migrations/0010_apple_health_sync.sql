CREATE TABLE public.health_daily_summaries (
  user_id uuid NOT NULL,
  day date NOT NULL,
  steps integer NOT NULL CHECK (steps BETWEEN 0 AND 200000),
  active_kcal integer CHECK (active_kcal BETWEEN 0 AND 20000),
  resting_hr integer CHECK (resting_hr BETWEEN 20 AND 250),
  average_hr integer CHECK (average_hr BETWEEN 20 AND 250),
  source text NOT NULL DEFAULT 'apple_shortcuts' CHECK (source IN ('apple_shortcuts','local_import')),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT, DELETE ON public.health_daily_summaries TO authenticated;
GRANT ALL ON public.health_daily_summaries TO service_role;
ALTER TABLE public.health_daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own health summaries select" ON public.health_daily_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own health summaries delete" ON public.health_daily_summaries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.health_sync_tokens (
  user_id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_count integer NOT NULL DEFAULT 0
);
GRANT SELECT (user_id, created_at, last_used_at) ON public.health_sync_tokens TO authenticated;
GRANT ALL ON public.health_sync_tokens TO service_role;
ALTER TABLE public.health_sync_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own health token metadata select" ON public.health_sync_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);