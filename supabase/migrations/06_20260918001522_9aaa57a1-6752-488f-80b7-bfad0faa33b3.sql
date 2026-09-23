CREATE OR REPLACE FUNCTION public.protect_activity_assignment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'gestao'::public.app_role) THEN
    IF OLD.assigned_to IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Atividade não atribuída ao usuário atual';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.area IS DISTINCT FROM OLD.area
      OR NEW.activity_type IS DISTINCT FROM OLD.activity_type
      OR NEW.location IS DISTINCT FROM OLD.location
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
      OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Analistas podem alterar somente o registro de execução e a conclusão';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_activity_assignment_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_activity_assignment_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_activity_assignment_fields() TO service_role;

DROP TRIGGER IF EXISTS activities_protect_assignment_fields ON public.activities;
CREATE TRIGGER activities_protect_assignment_fields
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.protect_activity_assignment_fields();