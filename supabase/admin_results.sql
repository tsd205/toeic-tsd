-- Run in Supabase SQL Editor (once, safe to re-run).
-- Requires public.is_admin() from schema.sql and existing attempts/answers/profiles tables.
-- Student sees own results; admin sees all. Never expose service_role keys in frontend.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS attempts_select_own_or_admin ON public.attempts;
CREATE POLICY attempts_select_own_or_admin ON public.attempts FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY IF EXISTS answers_select_own_or_admin ON public.attempt_answers;
CREATE POLICY answers_select_own_or_admin ON public.attempt_answers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = attempt_answers.attempt_id
AND (a.user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))));
GRANT SELECT ON public.profiles, public.attempts, public.attempt_answers TO authenticated;
