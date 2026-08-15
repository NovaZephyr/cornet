
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warnings_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gif_path text;

CREATE TABLE IF NOT EXISTS public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_warnings TO authenticated;
GRANT ALL ON public.user_warnings TO service_role;

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their warnings" ON public.user_warnings;
CREATE POLICY "Users see their warnings" ON public.user_warnings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "Admins manage warnings" ON public.user_warnings;
CREATE POLICY "Admins manage warnings" ON public.user_warnings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.enforce_partner_customization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.background_path IS DISTINCT FROM OLD.background_path
      OR NEW.gif_path IS DISTINCT FROM OLD.gif_path)
     AND NOT (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'admin'))
  THEN
    RAISE EXCEPTION 'Solo los Partners pueden cambiar el fondo o el GIF del perfil';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_partner_customization ON public.profiles;
CREATE TRIGGER enforce_partner_customization
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_customization();

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
