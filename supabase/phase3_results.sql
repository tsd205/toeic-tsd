-- Chạy một lần trong Supabase SQL Editor để cho phép học viên lưu kết quả của chính mình.
drop policy if exists attempts_insert_own on public.attempts;
create policy attempts_insert_own on public.attempts for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists answers_insert_own on public.attempt_answers;
create policy answers_insert_own on public.attempt_answers for insert to authenticated with check (exists (select 1 from public.attempts a where a.id=attempt_id and a.user_id=(select auth.uid())));
grant insert on public.attempts,public.attempt_answers to authenticated;
