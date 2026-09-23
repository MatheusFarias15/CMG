GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activities TO authenticated;
GRANT ALL ON TABLE public.activities TO service_role;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities select" ON public.activities;
CREATE POLICY "activities select"
ON public.activities
FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR private.has_role(auth.uid(), 'gestao'::public.app_role)
);

DROP POLICY IF EXISTS "activities update" ON public.activities;
CREATE POLICY "activities update"
ON public.activities
FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  OR private.has_role(auth.uid(), 'gestao'::public.app_role)
)
WITH CHECK (
  assigned_to = auth.uid()
  OR private.has_role(auth.uid(), 'gestao'::public.app_role)
);

DROP POLICY IF EXISTS "activities insert" ON public.activities;
CREATE POLICY "activities insert"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'gestao'::public.app_role)
);

DROP POLICY IF EXISTS "activities delete" ON public.activities;
CREATE POLICY "activities delete"
ON public.activities
FOR DELETE
TO authenticated
USING (
  private.has_role(auth.uid(), 'gestao'::public.app_role)
);