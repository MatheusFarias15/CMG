CREATE POLICY "cmg photos insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'activity-photos'
  AND EXISTS (SELECT 1 FROM public.activities a
    WHERE a.id = ((storage.foldername(name))[1])::uuid AND a.assigned_to = auth.uid())
);

CREATE POLICY "cmg photos select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'activity-photos'
  AND (public.has_role(auth.uid(),'gestao') OR EXISTS (SELECT 1 FROM public.activities a
    WHERE a.id = ((storage.foldername(name))[1])::uuid AND a.assigned_to = auth.uid()))
);

CREATE POLICY "cmg photos delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'activity-photos'
  AND (public.has_role(auth.uid(),'gestao') OR EXISTS (SELECT 1 FROM public.activities a
    WHERE a.id = ((storage.foldername(name))[1])::uuid AND a.assigned_to = auth.uid() AND a.status = 'em_andamento'))
);