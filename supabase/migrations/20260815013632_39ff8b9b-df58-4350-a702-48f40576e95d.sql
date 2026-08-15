
CREATE OR REPLACE FUNCTION public.generate_video_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT string_agg(substr('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (floor(random()*62)+1)::int, 1), '')
  FROM generate_series(1, 11)
$$;

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS code text;
UPDATE public.videos SET code = public.generate_video_code() WHERE code IS NULL;
ALTER TABLE public.videos ALTER COLUMN code SET DEFAULT public.generate_video_code();
ALTER TABLE public.videos ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS videos_code_key ON public.videos (code);

REVOKE EXECUTE ON FUNCTION public.enforce_partner_customization() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_video_code() FROM anon, public;
