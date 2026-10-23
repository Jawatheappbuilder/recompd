-- Phase 1: account-owned program drafts and reusable workout templates.
-- Each row is a single immutable-ID program whose mutable templates live in payload.
CREATE TABLE IF NOT EXISTS public.training_programs (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_programs TO authenticated;
GRANT ALL ON public.training_programs TO service_role;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_programs' AND policyname = 'Own training programs select') THEN
  CREATE POLICY "Own training programs select" ON public.training_programs FOR SELECT TO authenticated USING (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_programs' AND policyname = 'Own training programs insert') THEN
  CREATE POLICY "Own training programs insert" ON public.training_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_programs' AND policyname = 'Own training programs update') THEN
  CREATE POLICY "Own training programs update" ON public.training_programs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_programs' AND policyname = 'Own training programs delete') THEN
  CREATE POLICY "Own training programs delete" ON public.training_programs FOR DELETE TO authenticated USING (auth.uid() = user_id);
END IF; END $$;
CREATE INDEX IF NOT EXISTS training_programs_recent_idx ON public.training_programs (user_id, updated_at DESC);
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'training_programs_updated_at' AND tgrelid = 'public.training_programs'::regclass) THEN
  CREATE TRIGGER training_programs_updated_at BEFORE UPDATE ON public.training_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF; END $$;
