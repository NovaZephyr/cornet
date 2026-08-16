-- Backfill missing legacy video codes before relying on the new code column.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.videos WHERE code IS NULL OR trim(code) = '' LOOP
    UPDATE public.videos
    SET code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.videos
  ALTER COLUMN code SET NOT NULL;
