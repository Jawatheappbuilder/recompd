CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '' CHECK (char_length(name) <= 100),
  height_cm INTEGER CHECK (height_cm IS NULL OR (height_cm BETWEEN 80 AND 250)),
  gender TEXT CHECK (gender IS NULL OR gender IN ('Male','Female','Prefer not to say')),
  goals TEXT[] NOT NULL DEFAULT '{}',
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg','lb')),
  default_rest_seconds INTEGER NOT NULL DEFAULT 90 CHECK (default_rest_seconds IN (30,45,60,90,120,150,180)),
  weekly_workout_target INTEGER NOT NULL DEFAULT 4 CHECK (weekly_workout_target BETWEEN 2 AND 7),
  week_starts_on TEXT NOT NULL DEFAULT 'Monday' CHECK (week_starts_on IN ('Monday','Sunday')),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','dark','light')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'name', ''), 100))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();