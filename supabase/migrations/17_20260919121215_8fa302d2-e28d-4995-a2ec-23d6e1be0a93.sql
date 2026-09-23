DROP POLICY IF EXISTS "photos delete" ON public.activity_photos;
CREATE POLICY "photos delete"
ON public.activity_photos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.activities AS a
    WHERE a.id = activity_photos.activity_id
      AND (
        private.has_role(auth.uid(), 'gestao'::public.app_role)
        OR (
          a.assigned_to = auth.uid()
          AND a.status <> 'concluida'::public.activity_status
        )
      )
  )
);

DROP POLICY IF EXISTS "cmg photos delete" ON storage.objects;
CREATE POLICY "cmg photos delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'activity-photos'
  AND (
    private.has_role(auth.uid(), 'gestao'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.activities AS a
      WHERE a.id = ((storage.foldername(name))[1])::uuid
        AND a.assigned_to = auth.uid()
        AND a.status <> 'concluida'::public.activity_status
    )
  )
);