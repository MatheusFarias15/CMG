DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR private.has_role(auth.uid(), 'gestao'::public.app_role));

DROP POLICY IF EXISTS "roles select" ON public.user_roles;
CREATE POLICY "roles select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'gestao'::public.app_role));