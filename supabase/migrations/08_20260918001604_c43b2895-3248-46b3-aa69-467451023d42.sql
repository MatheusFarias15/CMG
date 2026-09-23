DROP POLICY IF EXISTS "roles management insert" ON public.user_roles;
DROP POLICY IF EXISTS "roles management delete" ON public.user_roles;

CREATE POLICY "roles management insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'gestao'::public.app_role));

CREATE POLICY "roles management delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'gestao'::public.app_role));