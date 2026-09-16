CREATE TYPE public.app_role AS ENUM ('gestao','analista');
CREATE TYPE public.activity_area AS ENUM ('climatizacao','eletrica','manutencao_predial','operacao_sistemas');
CREATE TYPE public.activity_type AS ENUM ('ronda_pavimentos','ajuste_vag','manutencao_preventiva');
CREATE TYPE public.activity_status AS ENUM ('em_andamento','concluida');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id text NOT NULL UNIQUE,
  full_name text NOT NULL,
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  area public.activity_area NOT NULL,
  activity_type public.activity_type NOT NULL,
  location text,
  description text,
  scheduled_date date NOT NULL DEFAULT (now()::date),
  status public.activity_status NOT NULL DEFAULT 'em_andamento',
  assigned_to uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  section text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_photos TO authenticated;
GRANT ALL ON public.activity_photos TO service_role;
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'gestao'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'gestao'));

CREATE POLICY "activities select" ON public.activities FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(),'gestao'));
CREATE POLICY "activities insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'gestao'));
CREATE POLICY "activities update" ON public.activities FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(),'gestao'))
  WITH CHECK (assigned_to = auth.uid() OR public.has_role(auth.uid(),'gestao'));
CREATE POLICY "activities delete" ON public.activities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'gestao'));

CREATE POLICY "photos select" ON public.activity_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id
    AND (a.assigned_to = auth.uid() OR public.has_role(auth.uid(),'gestao'))));
CREATE POLICY "photos insert" ON public.activity_photos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.assigned_to = auth.uid()));
CREATE POLICY "photos delete" ON public.activity_photos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id
    AND ((a.assigned_to = auth.uid() AND a.status = 'em_andamento') OR public.has_role(auth.uid(),'gestao'))));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER activities_touch BEFORE UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;