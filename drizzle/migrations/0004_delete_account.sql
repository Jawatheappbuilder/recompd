CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.workout_exercises WHERE user_id = uid;
  DELETE FROM public.workouts WHERE user_id = uid;
  DELETE FROM public.bodyweight_entries WHERE user_id = uid;
  DELETE FROM public.saved_workouts WHERE user_id = uid;
  DELETE FROM public.custom_exercises WHERE user_id = uid;
  DELETE FROM public.scheduled_workouts WHERE user_id = uid;
  DELETE FROM public.shared_workouts WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
