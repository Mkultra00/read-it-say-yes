
CREATE TABLE public.patient_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name text NOT NULL,
  family_members text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  memories text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select" ON public.patient_profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.patient_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.patient_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.patient_profiles FOR DELETE USING (true);

CREATE TRIGGER update_patient_profiles_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
