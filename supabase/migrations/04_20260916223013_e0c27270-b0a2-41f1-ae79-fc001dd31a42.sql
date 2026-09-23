CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER POLICY "own profile select" ON public.profiles USING (id = auth.uid() OR private.has_role(auth.uid(),'gestao'));
ALTER POLICY "roles select" ON public.user_roles USING (user_id = auth.uid() OR private.has_role(auth.uid(),'gestao'));
ALTER POLICY "activities select" ON public.activities USING (assigned_to = auth.uid() OR private.has_role(auth.uid(),'gestao'));
ALTER POLICY "activities insert" ON public.activities WITH CHECK (private.has_role(auth.uid(),'gestao'));
ALTER POLICY "activities update" ON public.activities USING (assigned_to = auth.uid() OR private.has_role(auth.uid(),'gestao')) WITH CHECK (assigned_to = auth.uid() OR private.has_role(auth.uid(),'gestao'));
ALTER POLICY "activities delete" ON public.activities USING (private.has_role(auth.uid(),'gestao'));
ALTER POLICY "photos select" ON public.activity_photos USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND (a.assigned_to = auth.uid() OR private.has_role(auth.uid(),'gestao'))));
ALTER POLICY "photos delete" ON public.activity_photos USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND ((a.assigned_to = auth.uid() AND a.status = 'em_andamento') OR private.has_role(auth.uid(),'gestao'))));
ALTER POLICY "cmg photos select" ON storage.objects USING (bucket_id = 'activity-photos' AND (private.has_role(auth.uid(),'gestao') OR EXISTS (SELECT 1 FROM public.activities a WHERE a.id = ((storage.foldername(name))[1])::uuid AND a.assigned_to = auth.uid())));
ALTER POLICY "cmg photos delete" ON storage.objects USING (bucket_id = 'activity-photos' AND (private.has_role(auth.uid(),'gestao') OR EXISTS (SELECT 1 FROM public.activities a WHERE a.id = ((storage.foldername(name))[1])::uuid AND a.assigned_to = auth.uid() AND a.status = 'em_andamento')));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.has_role(uuid, public.app_role);